import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from '../components/Header';
import { TimerCard } from '../components/TimerCard';
import { WorkNotesModal } from '../components/WorkNotesModal';
import { TodayStats } from '../components/TodayStats';
import { RecentScreenshots } from '../components/RecentScreenshots';
import { SettingsModal } from '../components/SettingsModal';
import { IdleWarningModal } from '../components/IdleWarningModal';
import { OfflineStatusBar, ConnectionState } from '../components/OfflineStatusBar';
import { agentApi } from '../services/api';
import { storage } from '../services/storage';
import { offlineStore } from '../local/offline-store';
import { localDb } from '../local/database';
import { offlineSync } from '../services/offline-sync';
import { LogOut } from 'lucide-react';
import { SessionStatus, ActiveSession, CapturedScreenshot, IdleConfig } from '../types';

interface TrackerPageProps {
  initialIsOnline?: boolean;
  onLogout: () => void;
}

export const TrackerPage: React.FC<TrackerPageProps> = ({ initialIsOnline = true, onLogout }) => {
  const employee = useMemo(() => storage.getEmployee(), []);
  const organization = useMemo(() => storage.getOrganization(), []);
  const schedule = useMemo(() => storage.getSchedule(), []);

  // Connection State Machine: CONNECTED | OFFLINE | RECONNECTING | SYNCING | ERROR
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    initialIsOnline ? 'CONNECTED' : 'OFFLINE',
  );
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);

  // State Machine: OFFLINE | ACTIVE | IDLE_WARNING | IDLE | BREAK
  const [status, setStatus] = useState<SessionStatus>('OFFLINE');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [breakSeconds, setBreakSeconds] = useState<number>(0);
  const [isIdle, setIsIdle] = useState<boolean>(false);
  const [idleSeconds, setIdleSeconds] = useState<number>(0);
  const [lastPunchOutTime, setLastPunchOutTime] = useState<string>('');

  // Idle tracking state
  const [idleConfig, setIdleConfig] = useState<IdleConfig>(() => storage.getIdleConfig());
  const [idleWarningSecondsLeft, setIdleWarningSecondsLeft] = useState<number>(60);
  const [currentIdlePeriodSeconds, setCurrentIdlePeriodSeconds] = useState<number>(0);
  const idleStartTimeRef = useRef<number | null>(null);

  // Today aggregates
  const [todayWorkedSeconds, setTodayWorkedSeconds] = useState<number>(0);
  const [todayActiveSeconds, setTodayActiveSeconds] = useState<number>(0);
  const [todayIdleSeconds, setTodayIdleSeconds] = useState<number>(0);
  const [todayBreakSeconds, setTodayBreakSeconds] = useState<number>(0);
  const [screenshots, setScreenshots] = useState<CapturedScreenshot[]>([]);

  // Modals & UI state
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [workNotes, setWorkNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // 1-Second Activity Bucket Aggregators for Screenshot Window
  const windowActiveSecondsRef = useRef<number>(0);
  const windowIdleSecondsRef = useRef<number>(0);

  // Telemetry buffer references
  const activeBucketSecRef = useRef<number>(0);
  const idleBucketSecRef = useRef<number>(0);

  const getTodayDateStr = () => new Date().toISOString().split('T')[0];

  const updatePendingCount = useCallback(async () => {
    try {
      const counts = await localDb.getPendingCount();
      const legacyCount = storage.getOfflineQueue().length + storage.getOfflineScreenshots().length;
      setPendingSyncCount(counts.total + legacyCount);
    } catch {
      setPendingSyncCount(0);
    }
  }, []);

  // 1. Initial Load: Load cached daily state and check for active server / local sessions
  useEffect(() => {
    const todayStr = getTodayDateStr();
    updatePendingCount();

    // Check cached daily state for this employee
    const employeeIdentifier = employee?.email || employee?.id;
    const cachedDaily = storage.getDailyState(employeeIdentifier, todayStr);

    if (cachedDaily && cachedDaily.date === todayStr) {
      setTodayWorkedSeconds(cachedDaily.workedSeconds || 0);
      setTodayActiveSeconds(cachedDaily.activeSeconds || 0);
      setTodayIdleSeconds(cachedDaily.idleSeconds || 0);
      setTodayBreakSeconds(cachedDaily.breakSeconds || 0);
      setLastPunchOutTime(cachedDaily.lastPunchOutTime || '');
    }

    // Check if there is an active local offline session in DB
    localDb.getActiveSession(employee?.id).then((localActive) => {
      if (localActive) {
        setActiveSession({
          id: localActive.localSessionId,
          status: localActive.status,
          startedAt: localActive.startedAt,
          projectId: localActive.projectId || null,
          taskId: localActive.taskId || null,
          notes: localActive.notes || null,
        });
        const isPaused = localActive.status === 'PAUSED';
        setStatus(isPaused ? 'BREAK' : 'ACTIVE');
        const startMs = new Date(localActive.startedAt).getTime();
        setSessionSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
        window.electronAPI?.updateTrayStatus(isPaused ? 'On Break' : 'Working');
      }
    });

    // If internet is connected on mount, fetch authoritative server summary and set CONNECTED
    const isNetOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (isNetOnline) {
      agentApi
        .getTodaySummary(todayStr)
        .then((summary) => {
          if (!summary) return;
          setTodayWorkedSeconds(summary.workedSeconds ?? summary.activeSeconds ?? 0);
          setTodayActiveSeconds(summary.activeSeconds ?? summary.workedSeconds ?? 0);
          setTodayIdleSeconds(summary.idleSeconds || 0);
          setTodayBreakSeconds(summary.breakSeconds || 0);
          setLastPunchOutTime(summary.lastPunchOutTime || '');
          setConnectionState('CONNECTED');
          setErrorMessage('');

          if (summary.activeSession) {
            setActiveSession(summary.activeSession);
            const isPaused = summary.activeSession.status === 'PAUSED';
            setStatus(isPaused ? 'BREAK' : 'ACTIVE');

            const startMs = new Date(summary.activeSession.startedAt).getTime();
            const curElapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            setSessionSeconds(curElapsed);
            window.electronAPI?.updateTrayStatus(isPaused ? 'On Break' : 'Working');
          } else {
            // No active session on server
            localDb.getActiveSession(employee?.id).then((localActive) => {
              if (!localActive) {
                setActiveSession(null);
                setStatus('OFFLINE');
                setSessionSeconds(0);
                window.electronAPI?.updateTrayStatus('Offline');
              }
            });
          }

          storage.setDailyState(
            {
              date: todayStr,
              workedSeconds: summary.workedSeconds ?? summary.activeSeconds ?? 0,
              activeSeconds: summary.activeSeconds ?? summary.workedSeconds ?? 0,
              idleSeconds: summary.idleSeconds || 0,
              breakSeconds: summary.breakSeconds || 0,
              lastPunchOutTime: summary.lastPunchOutTime || '',
            },
            employee,
          );
        })
        .catch((err) => {
          console.warn('Initial summary fetch error (offline or server starting):', err?.message);
        });
    }
  }, []); // Run ONCE on mount

  // Network State Change Listeners (No background sync worker!)
  useEffect(() => {
    const handleOffline = () => {
      console.log('[NETWORK] Connection lost. Switching tracker status to OFFLINE.');
      setConnectionState('OFFLINE');
    };

    const handleOnline = () => {
      console.log('[NETWORK] Internet restored. Verifying server connection...');
      const todayStr = getTodayDateStr();
      agentApi
        .getTodaySummary(todayStr)
        .then((summary) => {
          if (summary) {
            setConnectionState('CONNECTED');
            setErrorMessage('');
            setTodayWorkedSeconds(summary.workedSeconds ?? summary.activeSeconds ?? 0);
            setTodayActiveSeconds(summary.activeSeconds ?? summary.workedSeconds ?? 0);
            setTodayIdleSeconds(summary.idleSeconds || 0);
            setTodayBreakSeconds(summary.breakSeconds || 0);
            if (summary.lastPunchOutTime) {
              setLastPunchOutTime(summary.lastPunchOutTime);
            }
          }
        })
        .catch(() => {
          // If server is not yet reachable, keep OFFLINE
          setConnectionState('OFFLINE');
        });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);


    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // MANUAL RECONNECT & SYNC (Triggered explicitly by user click)
  const handleManualReconnect = async () => {
    if (connectionState === 'RECONNECTING' || connectionState === 'SYNCING') return;

    setConnectionState('RECONNECTING');
    setErrorMessage('');

    try {
      // Step into SYNCING
      setConnectionState('SYNCING');
      const res = await offlineSync.sync(activeSession?.id);

      if (res.success && res.isOnline) {
        setConnectionState('CONNECTED');
        setErrorMessage('');
        await updatePendingCount();

        // CRITICAL: Immediately update and reconcile combined totals (Sections 23 - 30)
        if (res.reconciledSummary) {
          const rec = res.reconciledSummary;
          setTodayWorkedSeconds(rec.todayWorkedSeconds);
          setTodayActiveSeconds(rec.todayActiveSeconds);
          setTodayIdleSeconds(rec.todayIdleSeconds);
          setTodayBreakSeconds(rec.todayBreakSeconds);

          if (rec.lastPunchOutTime) {
            setLastPunchOutTime(rec.lastPunchOutTime);
          }

          if (rec.activeSession) {
            setActiveSession(rec.activeSession);
            const isPaused = rec.activeSession.status === 'PAUSED';
            setStatus(isPaused ? 'BREAK' : 'ACTIVE');
            const startMs = new Date(rec.activeSession.startedAt).getTime();
            const curElapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            setSessionSeconds(curElapsed);
            window.electronAPI?.updateTrayStatus(isPaused ? 'On Break' : 'Working');
          } else if (status !== 'ACTIVE' && status !== 'BREAK') {
            setActiveSession(null);
            setStatus('OFFLINE');
            setSessionSeconds(0);
            window.electronAPI?.updateTrayStatus('Offline');
          }
        }

        window.electronAPI?.notify({
          title: 'TimeLogger: Connected',
          body: `Successfully synced ${res.syncedSessions + res.syncedEvents + res.syncedScreenshots} offline items.`,
        });
      } else {
        setConnectionState(res.isOnline ? 'ERROR' : 'OFFLINE');
        setErrorMessage(res.error || 'Unable to connect. Click to retry.');
        await updatePendingCount();
      }
    } catch (err: any) {
      console.error('[MANUAL SYNC] Unexpected sync error:', err);
      setConnectionState('ERROR');
      setErrorMessage(err?.message || 'Sync failed. Click to retry.');
    }
  };

  // 2. High Resolution Timer & System-Wide Idle Detection State Machine (1s Tick)
  useEffect(() => {
    if (status === 'OFFLINE') return;

    const timer = setInterval(async () => {
      // 1. Fetch system-wide idle seconds from Electron powerMonitor
      let currentIdle = 0;
      if (window.electronAPI) {
        try {
          currentIdle = await window.electronAPI.getIdleSeconds();
        } catch {
          currentIdle = 0;
        }
      }
      setIdleSeconds(currentIdle);

      const gracePeriod = idleConfig.gracePeriodSeconds || 60;
      const warningDuration = idleConfig.warningDurationSeconds || 60;
      const totalTimeout = gracePeriod + warningDuration;

      // 2. State Machine Transitions & Metric Aggregation
      if (status === 'ACTIVE') {
        // Continuous active work timer progression
        setSessionSeconds((prev) => prev + 1);
        setTodayWorkedSeconds((prev) => prev + 1);
        setTodayActiveSeconds((prev) => prev + 1);

        // Activity bucket classification for screenshot telemetry
        if (currentIdle < 2) {
          windowActiveSecondsRef.current += 1;
          activeBucketSecRef.current += 1;
        } else {
          windowIdleSecondsRef.current += 1;
          idleBucketSecRef.current += 1;
        }

        if (currentIdle >= gracePeriod) {
          // Grace period elapsed -> enter IDLE_WARNING state
          setStatus('IDLE_WARNING');
          const secLeft = Math.max(1, totalTimeout - currentIdle);
          setIdleWarningSecondsLeft(secLeft);
          console.log(`[IDLE] Inactivity started. Grace period elapsed (${gracePeriod}s). Warning started.`);
          window.electronAPI?.notify({
            title: 'TimeLogger: Inactivity Warning',
            body: `Inactivity detected. Warning countdown started (${secLeft}s left).`,
          });
        }
      } else if (status === 'IDLE_WARNING') {
        // During warning, session and worked seconds still progress until confirmed idle
        setSessionSeconds((prev) => prev + 1);
        setTodayWorkedSeconds((prev) => prev + 1);
        setTodayActiveSeconds((prev) => prev + 1);

        if (currentIdle < 2) {
          windowActiveSecondsRef.current += 1;
          activeBucketSecRef.current += 1;
        } else {
          windowIdleSecondsRef.current += 1;
          idleBucketSecRef.current += 1;
        }

        if (currentIdle < gracePeriod) {
          // Activity detected during warning -> cancel warning, resume ACTIVE
          setStatus('ACTIVE');
          setIsIdle(false);
          console.log('[IDLE] Activity detected during warning. Warning cancelled. User remains ACTIVE.');
        } else if (currentIdle >= totalTimeout) {
          // Warning countdown expired -> enter confirmed IDLE state
          setStatus('IDLE');
          setIsIdle(true);
          idleStartTimeRef.current = Date.now();
          setCurrentIdlePeriodSeconds(0);
          console.log(`[IDLE] Warning countdown expired (${totalTimeout}s total inactivity). User marked IDLE.`);
          window.electronAPI?.updateTrayStatus('Idle (Paused)');
          window.electronAPI?.notify({
            title: 'TimeLogger: Marked IDLE',
            body: 'Work tracking paused due to inactivity. Move mouse to resume.',
          });
        } else {
          // Continue warning countdown
          const secLeft = Math.max(1, totalTimeout - currentIdle);
          setIdleWarningSecondsLeft(secLeft);
        }
      } else if (status === 'IDLE') {
        // In confirmed IDLE state: Work timer is paused. Idle metrics increment!
        windowIdleSecondsRef.current += 1;
        idleBucketSecRef.current += 1;
        setCurrentIdlePeriodSeconds((prev) => prev + 1);
        setTodayIdleSeconds((prev) => prev + 1);

        if (currentIdle < 2) {
          // User resumed keyboard/mouse interaction!
          const idleDurationSec = idleStartTimeRef.current
            ? Math.max(1, Math.round((Date.now() - idleStartTimeRef.current) / 1000))
            : currentIdlePeriodSeconds;

          console.log(`[IDLE] Activity detected. Idle ended. Confirmed idle duration: ${idleDurationSec}s.`);

          // Record idle telemetry
          if (activeSession) {
            if (connectionState === 'CONNECTED' && !activeSession.id.startsWith('offline_')) {
              agentApi
                .sendHeartbeat({
                  sessionId: activeSession.id,
                  capturedAt: new Date().toISOString(),
                  activeSeconds: 0,
                  idleSeconds: idleDurationSec,
                  activeApplication: 'Desktop Work Session',
                  windowTitle: 'Resumed from Inactivity',
                })
                .catch(() => {
                  offlineStore.recordHeartbeat({
                    sessionId: activeSession.id,
                    activeSeconds: 0,
                    idleSeconds: idleDurationSec,
                    activeApplication: 'Desktop Work Session',
                    windowTitle: 'Resumed from Inactivity',
                  });
                });
            } else {
              offlineStore.recordHeartbeat({
                sessionId: activeSession.id,
                activeSeconds: 0,
                idleSeconds: idleDurationSec,
                activeApplication: 'Desktop Work Session',
                windowTitle: 'Resumed from Inactivity',
              });
              updatePendingCount();
            }
          }

          idleStartTimeRef.current = null;
          setCurrentIdlePeriodSeconds(0);
          setIsIdle(false);
          setStatus('ACTIVE');
          window.electronAPI?.updateTrayStatus('Working');
          window.electronAPI?.notify({
            title: 'TimeLogger: Work Resumed',
            body: 'Active work tracking resumed.',
          });
        }
      } else if (status === 'BREAK') {
        setBreakSeconds((prev) => prev + 1);
        setTodayBreakSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, idleConfig, activeSession, connectionState, updatePendingCount]);

  // Periodic persistence of this employee's active runtime metrics to local daily state
  useEffect(() => {
    if (status === 'OFFLINE' || !employee) return;
    const interval = setInterval(() => {
      const todayStr = getTodayDateStr();
      storage.setDailyState(
        {
          date: todayStr,
          workedSeconds: todayWorkedSeconds,
          activeSeconds: todayActiveSeconds,
          idleSeconds: todayIdleSeconds,
          breakSeconds: todayBreakSeconds,
          lastPunchOutTime,
        },
        employee,
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [status, employee, todayWorkedSeconds, todayActiveSeconds, todayIdleSeconds, todayBreakSeconds, lastPunchOutTime]);

  // 3. Telemetry Heartbeat Scheduler (Every 60s)
  useEffect(() => {
    if (status === 'OFFLINE' || !activeSession) return;

    const heartbeatInterval = setInterval(async () => {
      const act = activeBucketSecRef.current;
      const idl = idleBucketSecRef.current;

      if (act === 0 && idl === 0) return;

      activeBucketSecRef.current = 0;
      idleBucketSecRef.current = 0;

      const nowIso = new Date().toISOString();

      if (connectionState === 'CONNECTED' && !activeSession.id.startsWith('offline_')) {
        try {
          await agentApi.sendHeartbeat({
            sessionId: activeSession.id,
            capturedAt: nowIso,
            activeSeconds: act,
            idleSeconds: idl,
            activeApplication: 'Desktop Work Session',
            windowTitle: workNotes || 'TimeLogger Client',
          });
        } catch (err: any) {
          console.warn('[HEARTBEAT] Online send failed, storing offline:', err?.message);
          await offlineStore.recordHeartbeat({
            sessionId: activeSession.id,
            capturedAt: nowIso,
            activeSeconds: act,
            idleSeconds: idl,
            activeApplication: 'Desktop Work Session',
            windowTitle: workNotes || 'TimeLogger Client',
          });
          setConnectionState('OFFLINE');
          updatePendingCount();
        }
      } else {
        await offlineStore.recordHeartbeat({
          sessionId: activeSession.id,
          capturedAt: nowIso,
          activeSeconds: act,
          idleSeconds: idl,
          activeApplication: 'Desktop Work Session',
          windowTitle: workNotes || 'TimeLogger Client',
        });
        updatePendingCount();
      }
    }, 60000);

    return () => clearInterval(heartbeatInterval);
  }, [status, activeSession, workNotes, connectionState, updatePendingCount]);

  // 4. Screenshot Pipeline with Local File Storage
  const executeScreenshotCapture = async (sessionId: string) => {
    if (!window.electronAPI) return;

    try {
      const capture = await window.electronAPI.captureScreenshot();
      if (!capture || !capture.base64) return;

      const actSec = windowActiveSecondsRef.current;
      const idlSec = windowIdleSecondsRef.current;
      const trackedSec = actSec + idlSec;

      // Calculate actual interaction percentage over this screenshot window
      const actPct =
        trackedSec > 0
          ? Math.min(100, Math.max(0, Math.round((actSec / trackedSec) * 100)))
          : status === 'ACTIVE'
          ? 100
          : 0;

      // Reset activity accumulators for the next window
      windowActiveSecondsRef.current = 0;
      windowIdleSecondsRef.current = 0;

      if (connectionState === 'CONNECTED' && !sessionId.startsWith('offline_')) {
        try {
          const res = await agentApi.uploadScreenshotPipeline({
            sessionId,
            base64: capture.base64,
            dataUrl: capture.dataUrl,
            width: capture.width,
            height: capture.height,
            fileSize: capture.fileSize,
            mimeType: capture.mimeType,
            capturedAt: capture.capturedAt,
            activityPercentage: actPct,
          });

          const newScreenshot: CapturedScreenshot = {
            id: res.id || Math.random().toString(),
            timestamp: capture.capturedAt,
            dataUrl: capture.dataUrl || `data:${capture.mimeType};base64,${capture.base64}`,
            activityPercentage: actPct,
            storageKey: res.storageKey || '',
          };

          setScreenshots((prev) => [newScreenshot, ...prev.slice(0, 19)]);
          return;
        } catch (uploadErr) {
          console.warn('[SCREENSHOT] Online upload failed, saving to local file disk:', uploadErr);
          setConnectionState('OFFLINE');
        }
      }

      // Save to local offline file storage
      const savedSc = await offlineStore.recordScreenshot({
        sessionId,
        capturedAt: capture.capturedAt,
        base64: capture.base64,
        width: capture.width,
        height: capture.height,
        activityPercentage: actPct,
        mimeType: capture.mimeType,
      });

      await updatePendingCount();

      const newScreenshot: CapturedScreenshot = {
        id: savedSc.localScreenshotId,
        timestamp: capture.capturedAt,
        dataUrl: capture.dataUrl || `data:${capture.mimeType};base64,${capture.base64}`,
        activityPercentage: actPct,
        storageKey: 'offline_local',
      };

      setScreenshots((prev) => [newScreenshot, ...prev.slice(0, 19)]);
    } catch (err: any) {
      console.error('[SCREENSHOT] Capture error:', err);
    }
  };

  // Automated Periodic Screenshot Pipeline (Default: 5 Minutes or organization configured interval)
  useEffect(() => {
    if (status === 'OFFLINE' || status === 'BREAK' || !activeSession) return;

    const initialTimer = setTimeout(() => {
      executeScreenshotCapture(activeSession.id);
    }, 5000);

    const intervalMinutes = organization?.screenshotIntervalMinutes || 5;
    const screenshotIntervalMs = intervalMinutes * 60 * 1000;

    const screenshotTimer = setInterval(() => {
      executeScreenshotCapture(activeSession.id);
    }, screenshotIntervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(screenshotTimer);
    };
  }, [status, activeSession, organization, connectionState]);

  // Actions
  const handleStartSession = async () => {
    setLoading(true);
    try {
      let session: ActiveSession;

      if (connectionState === 'CONNECTED') {
        try {
          session = await agentApi.startWorkSession({
            notes: workNotes || undefined,
          });
        } catch (netErr: any) {
          console.warn('Network / API response starting session, falling back to local offline session:', netErr);
          setConnectionState('OFFLINE');
          const offSess = await offlineStore.startOfflineSession({ notes: workNotes });
          session = {
            id: offSess.localSessionId,
            status: 'ACTIVE',
            startedAt: offSess.startedAt,
            projectId: null,
            taskId: null,
            notes: workNotes || null,
          };
        }
      } else {
        const offSess = await offlineStore.startOfflineSession({ notes: workNotes });
        session = {
          id: offSess.localSessionId,
          status: 'ACTIVE',
          startedAt: offSess.startedAt,
          projectId: null,
          taskId: null,
          notes: workNotes || null,
        };
      }

      await updatePendingCount();

      // Refresh authoritative today summary if online
      const todayStr = getTodayDateStr();
      if (connectionState === 'CONNECTED' && !session.id.startsWith('offline_')) {
        const todaySum = await agentApi.getTodaySummary(todayStr).catch(() => null);
        if (todaySum) {
          setTodayWorkedSeconds(todaySum.workedSeconds ?? todaySum.activeSeconds ?? 0);
          setTodayActiveSeconds(todaySum.activeSeconds ?? todaySum.workedSeconds ?? 0);
          setTodayIdleSeconds(todaySum.idleSeconds || 0);
          setTodayBreakSeconds(todaySum.breakSeconds || 0);
        }
      }

      setActiveSession(session);
      setStatus('ACTIVE');
      setIsIdle(false);
      setSessionSeconds(0);
      setBreakSeconds(0);
      setCurrentIdlePeriodSeconds(0);
      idleStartTimeRef.current = null;
      windowActiveSecondsRef.current = 0;
      windowIdleSecondsRef.current = 0;
      activeBucketSecRef.current = 0;
      idleBucketSecRef.current = 0;

      // Send initial heartbeat if online
      if (connectionState === 'CONNECTED' && !session.id.startsWith('offline_')) {
        agentApi
          .sendHeartbeat({
            sessionId: session.id,
            capturedAt: new Date().toISOString(),
            activeSeconds: 1,
            idleSeconds: 0,
            activeApplication: 'Desktop Work Session',
            windowTitle: workNotes || 'TimeLogger Client',
          })
          .catch(() => {});
      }

      window.electronAPI?.updateTrayStatus('Working');
      window.electronAPI?.notify({
        title: session.id.startsWith('offline_') ? 'Offline Work Session Started' : 'Work Session Started',
        body: `Punched in successfully at ${new Date().toLocaleTimeString()}`,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const now = new Date();
      const punchOutStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const todayStr = getTodayDateStr();

      // Flush any telemetry buffers before stopping
      const act = activeBucketSecRef.current;
      const idl = idleBucketSecRef.current;
      if (act > 0 || idl > 0) {
        activeBucketSecRef.current = 0;
        idleBucketSecRef.current = 0;
        if (connectionState === 'CONNECTED' && !activeSession.id.startsWith('offline_')) {
          await agentApi
            .sendHeartbeat({
              sessionId: activeSession.id,
              capturedAt: now.toISOString(),
              activeSeconds: act,
              idleSeconds: idl,
              activeApplication: 'Desktop Work Session',
              windowTitle: workNotes || 'TimeLogger Client',
            })
            .catch(() => {});
        } else {
          await offlineStore.recordHeartbeat({
            sessionId: activeSession.id,
            capturedAt: now.toISOString(),
            activeSeconds: act,
            idleSeconds: idl,
            activeApplication: 'Desktop Work Session',
            windowTitle: workNotes || 'TimeLogger Client',
          });
        }
      }

      if (activeSession.id.startsWith('offline_')) {
        await offlineStore.stopOfflineSession(activeSession.id, workNotes || undefined);
        await updatePendingCount();
      } else if (connectionState === 'CONNECTED') {
        try {
          await agentApi.stopWorkSession({
            sessionId: activeSession.id,
            notes: workNotes || undefined,
          });

          // Fetch authoritative server summary immediately after stop
          const serverSummary = await agentApi.getTodaySummary(todayStr).catch(() => null);
          if (serverSummary) {
            setTodayWorkedSeconds(serverSummary.workedSeconds ?? serverSummary.activeSeconds ?? 0);
            setTodayActiveSeconds(serverSummary.activeSeconds ?? serverSummary.workedSeconds ?? 0);
            setTodayIdleSeconds(serverSummary.idleSeconds || 0);
            setTodayBreakSeconds(serverSummary.breakSeconds || 0);
            setLastPunchOutTime(serverSummary.lastPunchOutTime || punchOutStr);

            storage.setDailyState(
              {
                date: todayStr,
                workedSeconds: serverSummary.workedSeconds ?? serverSummary.activeSeconds ?? 0,
                activeSeconds: serverSummary.activeSeconds ?? serverSummary.workedSeconds ?? 0,
                idleSeconds: serverSummary.idleSeconds || 0,
                breakSeconds: serverSummary.breakSeconds || 0,
                lastPunchOutTime: serverSummary.lastPunchOutTime || punchOutStr,
              },
              employee,
            );
          }
        } catch {
          await offlineStore.stopOfflineSession(activeSession.id, workNotes || undefined);
          await updatePendingCount();
        }
      } else {
        await offlineStore.stopOfflineSession(activeSession.id, workNotes || undefined);
        await updatePendingCount();
      }

      setStatus('OFFLINE');
      setActiveSession(null);
      setIsIdle(false);
      setLastPunchOutTime(punchOutStr);
      setSessionSeconds(0);
      setBreakSeconds(0);
      setCurrentIdlePeriodSeconds(0);
      idleStartTimeRef.current = null;
      activeBucketSecRef.current = 0;
      idleBucketSecRef.current = 0;

      window.electronAPI?.updateTrayStatus('Offline');
      window.electronAPI?.notify({
        title: 'Work Session Stopped',
        body: `Punched out at ${punchOutStr}. Today Total: ${Math.floor(todayWorkedSeconds / 3600)}h ${Math.floor((todayWorkedSeconds % 3600) / 60)}m`,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to stop session');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async (reason: string = 'Break') => {
    if (!activeSession) return;
    setLoading(true);
    try {
      if (connectionState === 'CONNECTED' && !activeSession.id.startsWith('offline_')) {
        await agentApi.startBreak({
          sessionId: activeSession.id,
          reason,
        });
      } else {
        await offlineStore.recordBreakStart(activeSession.id, reason);
        await updatePendingCount();
      }

      setStatus('BREAK');
      setIsIdle(false);
      setBreakSeconds(0);
      setCurrentIdlePeriodSeconds(0);
      idleStartTimeRef.current = null;
      window.electronAPI?.updateTrayStatus('On Break');
      window.electronAPI?.notify({
        title: 'Break Started',
        body: 'Work timer paused.',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to start break');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      if (connectionState === 'CONNECTED' && !activeSession.id.startsWith('offline_')) {
        await agentApi.endBreak({ sessionId: activeSession.id });
      } else {
        await offlineStore.recordBreakEnd(activeSession.id);
        await updatePendingCount();
      }

      setStatus('ACTIVE');
      setIsIdle(false);
      setBreakSeconds(0);
      window.electronAPI?.updateTrayStatus('Working');
      window.electronAPI?.notify({
        title: 'Work Resumed',
        body: 'Resumed tracking active session.',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to resume session');
    } finally {
      setLoading(false);
    }
  };

  const handleDismissIdleWarning = () => {
    console.log('[IDLE] User dismissed idle warning explicitly. Marked ACTIVE.');
    setStatus('ACTIVE');
    setIsIdle(false);
  };

  const handleResumeFromIdle = () => {
    const idleDurationSec = idleStartTimeRef.current
      ? Math.max(1, Math.round((Date.now() - idleStartTimeRef.current) / 1000))
      : currentIdlePeriodSeconds;

    console.log(`[IDLE] User clicked Resume Work. Idle ended. Idle duration: ${idleDurationSec}s.`);

    if (activeSession) {
      if (connectionState === 'CONNECTED' && !activeSession.id.startsWith('offline_')) {
        agentApi
          .sendHeartbeat({
            sessionId: activeSession.id,
            capturedAt: new Date().toISOString(),
            activeSeconds: 0,
            idleSeconds: idleDurationSec,
            activeApplication: 'Desktop Work Session',
            windowTitle: 'Resumed from Inactivity via Button',
          })
          .catch(() => {});
      } else {
        offlineStore.recordHeartbeat({
          sessionId: activeSession.id,
          activeSeconds: 0,
          idleSeconds: idleDurationSec,
          activeApplication: 'Desktop Work Session',
          windowTitle: 'Resumed from Inactivity via Button',
        });
        updatePendingCount();
      }
    }

    idleStartTimeRef.current = null;
    setCurrentIdlePeriodSeconds(0);
    setIsIdle(false);
    setStatus('ACTIVE');
    window.electronAPI?.updateTrayStatus('Working');
  };

  const handleLogoutWithReset = async () => {
    const now = new Date();
    const punchOutStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayStr = getTodayDateStr();

    if (activeSession) {
      if (activeSession.id.startsWith('offline_')) {
        await offlineStore.stopOfflineSession(activeSession.id, workNotes || undefined);
      } else if (connectionState === 'CONNECTED') {
        try {
          await agentApi.stopWorkSession({
            sessionId: activeSession.id,
            notes: workNotes || undefined,
          });
        } catch {
          await offlineStore.stopOfflineSession(activeSession.id, workNotes || undefined);
        }
      } else {
        await offlineStore.stopOfflineSession(activeSession.id, workNotes || undefined);
      }
    }

    if (employee) {
      storage.setDailyState(
        {
          date: todayStr,
          workedSeconds: todayWorkedSeconds,
          activeSeconds: todayActiveSeconds,
          idleSeconds: todayIdleSeconds,
          breakSeconds: todayBreakSeconds,
          lastPunchOutTime: activeSession ? punchOutStr : lastPunchOutTime,
        },
        employee,
      );
    }

    setStatus('OFFLINE');
    setActiveSession(null);
    setIsIdle(false);
    setSessionSeconds(0);
    setTodayWorkedSeconds(0);
    setTodayActiveSeconds(0);
    setTodayIdleSeconds(0);
    setTodayBreakSeconds(0);
    setCurrentIdlePeriodSeconds(0);
    idleStartTimeRef.current = null;
    setScreenshots([]);
    setLastPunchOutTime('');
    window.electronAPI?.updateTrayStatus('Offline');

    onLogout();
  };

  const timeoutMinutes = Math.round(
    ((idleConfig.gracePeriodSeconds || 60) + (idleConfig.warningDurationSeconds || 60)) / 60,
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden select-none bg-[#f4f4f4] text-[#161616] font-sans tracking-carbon">
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOnline={connectionState === 'CONNECTED'}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-[#e0e0e0]">
        {/* Employee Bar */}
        <div className="flex items-center justify-between bg-[#ffffff] border border-[#e0e0e0] rounded-none px-3 py-2 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-none bg-[#0f62fe] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
              {employee?.firstName?.[0] || employee?.displayName?.[0] || 'U'}
              {employee?.lastName?.[0] || ''}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#161616] truncate">
                  {employee?.displayName || 'TimeLogger User'}
                </span>
                {employee?.employeeCode && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-[#f4f4f4] text-[#161616] border border-[#e0e0e0]">
                    {employee.employeeCode}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#525252] truncate">
                {employee?.email ? <span className="text-[#161616]">{employee.email} • </span> : null}
                {organization?.name || 'Workspace'} • {schedule?.name || 'Standard Shift'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {lastPunchOutTime && status === 'OFFLINE' && (
              <div className="text-[11px] text-[#525252] bg-[#f4f4f4] px-2 py-1 rounded-none border border-[#e0e0e0] hidden sm:block">
                Last Out: <span className="text-[#161616] font-semibold">{lastPunchOutTime}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogoutWithReset}
              title="Sign out / Switch user"
              className="px-2.5 py-1 rounded-none bg-[#f4f4f4] hover:bg-[#da1e28] hover:text-white border border-[#e0e0e0] text-[#161616] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Live Timer Card */}
        <TimerCard
          status={status}
          sessionSeconds={sessionSeconds}
          todayWorkedSeconds={todayWorkedSeconds}
          todayActiveSeconds={todayActiveSeconds}
          breakSeconds={breakSeconds}
          isIdle={isIdle}
          idleSeconds={idleSeconds}
          currentIdleDuration={currentIdlePeriodSeconds}
          loading={loading}
          lastPunchOutTime={lastPunchOutTime}
          onStartSession={handleStartSession}
          onStopSession={handleStopSession}
          onStartBreak={() => handleStartBreak('Break')}
          onEndBreak={handleEndBreak}
          onResumeFromIdle={handleResumeFromIdle}
          onOpenNotes={() => setIsNotesModalOpen(true)}
        />

        {/* Today's Summary Metrics */}
        <TodayStats
          totalWorkedSeconds={todayWorkedSeconds}
          activeSeconds={todayActiveSeconds}
          idleSeconds={todayIdleSeconds}
          breakSeconds={todayBreakSeconds}
          screenshotCount={screenshots.length}
        />

        {/* Recent Screenshot Captures */}
        <RecentScreenshots screenshots={screenshots} />
      </div>

      {/* Persistent Bottom Offline / Online Status Bar */}
      <OfflineStatusBar
        connectionState={connectionState}
        pendingCount={pendingSyncCount}
        onReconnect={handleManualReconnect}
        errorMessage={errorMessage}
      />

      {/* TeamLogger-style Idle Warning Countdown Modal */}
      <IdleWarningModal
        isOpen={status === 'IDLE_WARNING'}
        secondsRemaining={idleWarningSecondsLeft}
        totalWarningDuration={idleConfig.warningDurationSeconds || 60}
        totalInactivitySeconds={idleSeconds}
        idleTimeoutMinutes={timeoutMinutes}
        onDismiss={handleDismissIdleWarning}
      />

      {/* Modals */}
      <WorkNotesModal
        isOpen={isNotesModalOpen}
        initialNotes={workNotes}
        onClose={() => setIsNotesModalOpen(false)}
        onSaveNotes={setWorkNotes}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onLogout={handleLogoutWithReset}
        onIdleConfigChange={(cfg) => setIdleConfig(cfg)}
      />
    </div>
  );
};
