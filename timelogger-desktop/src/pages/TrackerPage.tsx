import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Header } from '../components/Header';
import { TimerCard } from '../components/TimerCard';
import { WorkNotesModal } from '../components/WorkNotesModal';
import { TodayStats } from '../components/TodayStats';
import { RecentScreenshots } from '../components/RecentScreenshots';
import { SettingsModal } from '../components/SettingsModal';
import { IdleWarningModal } from '../components/IdleWarningModal';
import { agentApi } from '../services/api';
import { storage } from '../services/storage';
import { durableOfflineStore } from '../services/durable-offline-store';
import { syncWorker, SyncStatusInfo } from '../services/sync-worker';
import { LogOut, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { SessionStatus, ActiveSession, CapturedScreenshot, IdleConfig } from '../types';

interface TrackerPageProps {
  onLogout: () => void;
}

export const TrackerPage: React.FC<TrackerPageProps> = ({ onLogout }) => {
  const employee = useMemo(() => storage.getEmployee(), []);
  const organization = useMemo(() => storage.getOrganization(), []);
  const schedule = useMemo(() => storage.getSchedule(), []);

  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(() => syncWorker.getStatus());

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

  // Screenshot throttling & tracking refs to prevent duplicate/clustered screenshot captures
  const lastScreenshotTimeRef = useRef<number>(0);
  const initialCaptureDoneSessionIdRef = useRef<string | null>(null);
  const isCapturingScreenshotRef = useRef<boolean>(false);

  const getTodayDateStr = () => new Date().toISOString().split('T')[0];

  // 1. Initial Load: Load Cached Data, subscribe to Sync Worker, fetch authoritative Summary from DB ONCE
  useEffect(() => {
    const todayStr = getTodayDateStr();

    // Subscribe to background sync worker updates
    const unsubscribeSync = syncWorker.subscribe((statusInfo) => {
      setSyncStatus(statusInfo);
    });

    syncWorker.setSessionMappedCallback((oldId, newId) => {
      setActiveSession((prev) => (prev && prev.id === oldId ? { ...prev, id: newId } : prev));
    });

    // Check if this specific employee has an entry in the local array for today
    const employeeIdentifier = employee?.email || employee?.id;
    const cachedDaily = storage.getDailyState(employeeIdentifier, todayStr);

    if (cachedDaily && cachedDaily.date === todayStr) {
      setTodayWorkedSeconds(cachedDaily.workedSeconds || 0);
      setTodayActiveSeconds(cachedDaily.activeSeconds || 0);
      setTodayIdleSeconds(cachedDaily.idleSeconds || 0);
      setTodayBreakSeconds(cachedDaily.breakSeconds || 0);
      setLastPunchOutTime(cachedDaily.lastPunchOutTime || '');
    } else {
      setTodayWorkedSeconds(0);
      setTodayActiveSeconds(0);
      setTodayIdleSeconds(0);
      setTodayBreakSeconds(0);
      setLastPunchOutTime('');
    }

    // Fetch authoritative server summary once
    agentApi
      .getTodaySummary(todayStr)
      .then((summary) => {
        if (!summary) return;
        const sWorked = summary.workedSeconds ?? summary.activeSeconds ?? 0;
        const sActive = summary.activeSeconds ?? summary.workedSeconds ?? 0;
        setTodayWorkedSeconds((prev) => Math.max(prev, sWorked));
        setTodayActiveSeconds((prev) => Math.max(prev, sActive));
        setTodayIdleSeconds((prev) => Math.max(prev, summary.idleSeconds || 0));
        setTodayBreakSeconds((prev) => Math.max(prev, summary.breakSeconds || 0));
        setLastPunchOutTime((prev) => summary.lastPunchOutTime || prev);

        if (summary.activeSession) {
          setActiveSession(summary.activeSession);
          const isPaused = summary.activeSession.status === 'PAUSED';
          setStatus(isPaused ? 'BREAK' : 'ACTIVE');

          const startMs = new Date(summary.activeSession.startedAt).getTime();
          const curElapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
          setSessionSeconds(curElapsed);
          window.electronAPI?.updateTrayStatus(isPaused ? 'On Break' : 'Working');
        } else {
          setActiveSession(null);
          setStatus('OFFLINE');
          setSessionSeconds(0);
          window.electronAPI?.updateTrayStatus('Offline');
        }

        if (summary.recentScreenshots && Array.isArray(summary.recentScreenshots) && summary.recentScreenshots.length > 0) {
          const mapped: CapturedScreenshot[] = summary.recentScreenshots.map((sc: any) => ({
            id: sc.id,
            timestamp: sc.capturedAt,
            dataUrl: sc.fileUrl || (sc.storageKey?.startsWith('http') || sc.storageKey?.startsWith('data:') ? sc.storageKey : `${storage.getServerUrl()}/agent/screenshots/${sc.id}/image`),
            activityPercentage: sc.activityPercentage ?? 100,
            storageKey: sc.storageKey || '',
          }));
          setScreenshots(mapped);
        }

        storage.setDailyState(
          {
            date: todayStr,
            workedSeconds: sWorked,
            activeSeconds: sActive,
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

    return () => {
      unsubscribeSync();
    };
  }, [employee]); // Run ONCE on mount

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
        setSessionSeconds((prev) => {
          const nextSec = prev + 1;

          // Master Screenshot Schedule Check: strictly 1 initial shot at 5s, then every 5 minutes (300s)
          if (activeSession) {
            const intervalMinutes = organization?.screenshotIntervalMinutes || 5;
            const intervalSec = intervalMinutes * 60; // 300s

            if (nextSec === 5 && initialCaptureDoneSessionIdRef.current !== activeSession.id) {
              initialCaptureDoneSessionIdRef.current = activeSession.id;
              executeScreenshotCapture(activeSession.id, true);
            } else if (nextSec > 0 && nextSec % intervalSec === 0) {
              executeScreenshotCapture(activeSession.id, false);
            }
          }

          return nextSec;
        });

        setTodayWorkedSeconds((prev) => prev + 1);
        setTodayActiveSeconds((prev) => prev + 1);

        // Activity bucket classification for screenshot density
        if (currentIdle < 2) {
          windowActiveSecondsRef.current += 1;
        } else {
          windowIdleSecondsRef.current += 1;
        }

        // Active work telemetry accumulates active worked seconds
        activeBucketSecRef.current += 1;

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
        setSessionSeconds((prev) => {
          const nextSec = prev + 1;
          if (activeSession) {
            const intervalMinutes = organization?.screenshotIntervalMinutes || 5;
            const intervalSec = intervalMinutes * 60;
            if (nextSec > 0 && nextSec % intervalSec === 0) {
              executeScreenshotCapture(activeSession.id, false);
            }
          }
          return nextSec;
        });
        setTodayWorkedSeconds((prev) => prev + 1);
        setTodayActiveSeconds((prev) => prev + 1);

        if (currentIdle < 2) {
          windowActiveSecondsRef.current += 1;
        } else {
          windowIdleSecondsRef.current += 1;
        }

        // User is still in warning countdown (not yet confirmed idle) -> count as active work
        activeBucketSecRef.current += 1;

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
          idleBucketSecRef.current = 0;
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
          if (secLeft % 15 === 0 || secLeft <= 5) {
            console.log(`[IDLE] Warning countdown: ${secLeft}s`);
          }
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

          // Reset idle telemetry buffer and record idle telemetry heartbeat immediately
          idleBucketSecRef.current = 0;

          if (activeSession) {
            agentApi
              .sendHeartbeat({
                sessionId: activeSession.id,
                capturedAt: new Date().toISOString(),
                activeSeconds: 0,
                idleSeconds: idleDurationSec,
                activeApplication: 'Desktop Work Session',
                windowTitle: 'Resumed from Inactivity',
              })
              .catch(() => {});
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
  }, [status, idleConfig, activeSession, organization?.screenshotIntervalMinutes]);

  // Periodic persistence of this employee's active runtime metrics
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

      try {
        await agentApi.sendHeartbeat({
          sessionId: activeSession.id,
          capturedAt: new Date().toISOString(),
          activeSeconds: act,
          idleSeconds: idl,
          activeApplication: 'Desktop Work Session',
          windowTitle: workNotes || 'TimeLogger Client',
        });
      } catch (err: any) {
        console.warn('[HEARTBEAT] Warning:', err?.message);
      }
    }, 60000);

    return () => clearInterval(heartbeatInterval);
  }, [status, activeSession, workNotes]);

  // 4. Robust Screenshot Capture Function (Strictly Cooldown-Enforced)
  const executeScreenshotCapture = async (sessionId: string, isInitial: boolean = false) => {
    if (!window.electronAPI || isCapturingScreenshotRef.current) return;

    const now = Date.now();
    const intervalMinutes = organization?.screenshotIntervalMinutes || 5;
    const minIntervalMs = intervalMinutes * 60 * 1000 - 15000; // Minimum 4m 45s between regular shots

    // If not the initial 5-second capture, enforce strict cooldown
    if (!isInitial && (now - lastScreenshotTimeRef.current) < minIntervalMs) {
      console.log(
        `[SCREENSHOT] Throttled: only ${Math.round((now - lastScreenshotTimeRef.current) / 1000)}s since last screenshot. Next capture scheduled in 5m.`,
      );
      return;
    }

    try {
      isCapturingScreenshotRef.current = true;
      lastScreenshotTimeRef.current = now;
      if (isInitial) {
        initialCaptureDoneSessionIdRef.current = sessionId;
      }

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

      console.log(
        `[SCREENSHOT] Captured at ${new Date().toLocaleTimeString()} (Active: ${actSec}s, Tracked: ${trackedSec}s, Activity: ${actPct}%)`,
      );

      // Reset activity accumulators for next window
      windowActiveSecondsRef.current = 0;
      windowIdleSecondsRef.current = 0;

      if (syncStatus.isOnline && !sessionId.startsWith('offline_')) {
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

          setScreenshots((prev) => [newScreenshot, ...prev.filter(s => s.id !== newScreenshot.id).slice(0, 19)]);
          return;
        } catch (uploadErr) {
          console.warn('[SCREENSHOT] Online upload failed, persisting to durable offline store:', uploadErr);
        }
      }

      // Save to Durable Offline Screenshot Storage (Disk JPEG file + SQLite / JSON queue)
      await durableOfflineStore.enqueueScreenshot({
        sessionId,
        capturedAt: capture.capturedAt,
        fileSize: capture.fileSize,
        mimeType: capture.mimeType,
        width: capture.width,
        height: capture.height,
        activityPercentage: actPct,
        base64: capture.base64,
      });

      const newScreenshot: CapturedScreenshot = {
        id: `offline_${Date.now()}`,
        timestamp: capture.capturedAt,
        dataUrl: capture.dataUrl || `data:${capture.mimeType};base64,${capture.base64}`,
        activityPercentage: actPct,
        storageKey: 'offline',
      };

      setScreenshots((prev) => [newScreenshot, ...prev.filter(s => s.id !== newScreenshot.id).slice(0, 19)]);

      // Request automatic sync in background if connection is healthy
      syncWorker.triggerAutoSync(sessionId);
    } catch (err: any) {
      console.error('[SCREENSHOT] Capture error:', err);
    } finally {
      isCapturingScreenshotRef.current = false;
    }
  };

  // Actions
  const handleStartSession = async () => {
    setLoading(true);
    try {
      let session: ActiveSession;

      if (syncStatus.isOnline) {
        try {
          session = await agentApi.startWorkSession({
            notes: workNotes || undefined,
          });
        } catch (netErr: any) {
          console.warn('Network / API response starting session:', netErr);
          const current = await agentApi.getCurrentSession().catch(() => null);
          if (current) {
            session = current;
          } else {
            const todaySum = await agentApi.getTodaySummary().catch(() => null);
            if (todaySum?.activeSession) {
              session = todaySum.activeSession;
            } else {
              session = await createOfflineSession();
            }
          }
        }
      } else {
        session = await createOfflineSession();
      }

      // Refresh authoritative today summary on start if online
      const todayStr = getTodayDateStr();
      if (syncStatus.isOnline && !session.id.startsWith('offline_')) {
        const todaySum = await agentApi.getTodaySummary(todayStr).catch(() => null);
        if (todaySum) {
          const sWorked = todaySum.workedSeconds ?? todaySum.activeSeconds ?? 0;
          const sActive = todaySum.activeSeconds ?? todaySum.workedSeconds ?? 0;
          setTodayWorkedSeconds((prev) => Math.max(prev, sWorked));
          setTodayActiveSeconds((prev) => Math.max(prev, sActive));
          setTodayIdleSeconds((prev) => Math.max(prev, todaySum.idleSeconds || 0));
          setTodayBreakSeconds((prev) => Math.max(prev, todaySum.breakSeconds || 0));
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

      // Reset screenshot tracker for new session
      initialCaptureDoneSessionIdRef.current = null;
      lastScreenshotTimeRef.current = 0;

      // Send initial heartbeat if online
      if (!session.id.startsWith('offline_')) {
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

  const createOfflineSession = async (): Promise<ActiveSession> => {
    const offlineId = `offline_sess_${Date.now()}`;
    const startedAt = new Date().toISOString();

    await durableOfflineStore.enqueueEvent({
      type: 'SESSION_START',
      endpoint: '/agent/work-sessions/sync-offline',
      payload: {
        clientSessionId: offlineId,
        startedAt,
        notes: workNotes || undefined,
      },
      occurredAt: startedAt,
    });

    return {
      id: offlineId,
      status: 'ACTIVE',
      startedAt,
      projectId: null,
      taskId: null,
      notes: workNotes || null,
    };
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const now = new Date();
      const punchOutStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const todayStr = getTodayDateStr();

      // Finalize idle period if stopping while in IDLE
      if (status === 'IDLE' && idleStartTimeRef.current) {
        const idleDurationSec = Math.max(1, Math.round((Date.now() - idleStartTimeRef.current) / 1000));
        console.log(`[IDLE] Session stopped while in IDLE. Finalized idle duration: ${idleDurationSec}s.`);
      }

      // Flush any telemetry buffers before stopping
      const act = activeBucketSecRef.current;
      const idl = idleBucketSecRef.current;
      if ((act > 0 || idl > 0) && !activeSession.id.startsWith('offline_') && syncStatus.isOnline) {
        activeBucketSecRef.current = 0;
        idleBucketSecRef.current = 0;
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
      }

      let finalWorked = todayWorkedSeconds;
      let finalActive = todayActiveSeconds;
      let finalIdle = todayIdleSeconds;
      let finalBreak = todayBreakSeconds;
      let finalLastPunchOut = punchOutStr;

      if (activeSession.id.startsWith('offline_')) {
        await durableOfflineStore.enqueueEvent({
          type: 'SESSION_STOP',
          endpoint: '/agent/work-sessions/sync-offline',
          payload: {
            clientSessionId: activeSession.id,
            startedAt: activeSession.startedAt,
            endedAt: now.toISOString(),
            notes: workNotes || undefined,
          },
          occurredAt: now.toISOString(),
        });
      } else if (syncStatus.isOnline) {
        try {
          await agentApi.stopWorkSession({
            sessionId: activeSession.id,
            notes: workNotes || undefined,
          });

          // Fetch authoritative server summary immediately after stop
          const serverSummary = await agentApi.getTodaySummary(todayStr).catch(() => null);
          if (serverSummary) {
            const sWorked = serverSummary.workedSeconds ?? serverSummary.activeSeconds ?? 0;
            const sActive = serverSummary.activeSeconds ?? serverSummary.workedSeconds ?? 0;
            finalWorked = Math.max(todayWorkedSeconds, sWorked);
            finalActive = Math.max(todayActiveSeconds, sActive);
            finalIdle = Math.max(todayIdleSeconds, serverSummary.idleSeconds || 0);
            finalBreak = Math.max(todayBreakSeconds, serverSummary.breakSeconds || 0);
            finalLastPunchOut = serverSummary.lastPunchOutTime || punchOutStr;

            setTodayWorkedSeconds(finalWorked);
            setTodayActiveSeconds(finalActive);
            setTodayIdleSeconds(finalIdle);
            setTodayBreakSeconds(finalBreak);
            setLastPunchOutTime(finalLastPunchOut);
          }
        } catch {
          await durableOfflineStore.enqueueEvent({
            type: 'SESSION_STOP',
            endpoint: '/agent/work-sessions/stop',
            payload: {
              sessionId: activeSession.id,
              notes: workNotes || undefined,
            },
            occurredAt: now.toISOString(),
          });
        }
      } else {
        await durableOfflineStore.enqueueEvent({
          type: 'SESSION_STOP',
          endpoint: '/agent/work-sessions/stop',
          payload: {
            sessionId: activeSession.id,
            notes: workNotes || undefined,
          },
          occurredAt: now.toISOString(),
        });
      }

      // Persist daily state locally to ensure continuity across app restarts/sign outs
      storage.setDailyState(
        {
          date: todayStr,
          workedSeconds: finalWorked,
          activeSeconds: finalActive,
          idleSeconds: finalIdle,
          breakSeconds: finalBreak,
          lastPunchOutTime: finalLastPunchOut,
        },
        employee,
      );

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
      initialCaptureDoneSessionIdRef.current = null;

      window.electronAPI?.updateTrayStatus('Offline');
      window.electronAPI?.notify({
        title: 'Work Session Stopped',
        body: `Punched out at ${punchOutStr}. Today Total: ${Math.floor(todayWorkedSeconds / 3600)}h ${Math.floor((todayWorkedSeconds % 3600) / 60)}m`,
      });

      // Automatically trigger sync worker
      syncWorker.triggerAutoSync();
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
      if (syncStatus.isOnline && !activeSession.id.startsWith('offline_')) {
        await agentApi.startBreak({
          sessionId: activeSession.id,
          reason,
        });
      } else {
        await durableOfflineStore.enqueueEvent({
          type: 'SESSION_BREAK_START',
          endpoint: '/agent/work-sessions/break/start',
          payload: { sessionId: activeSession.id, reason },
          occurredAt: new Date().toISOString(),
        });
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
      if (syncStatus.isOnline && !activeSession.id.startsWith('offline_')) {
        await agentApi.endBreak({ sessionId: activeSession.id });
      } else {
        await durableOfflineStore.enqueueEvent({
          type: 'SESSION_BREAK_END',
          endpoint: '/agent/work-sessions/break/end',
          payload: { sessionId: activeSession.id },
          occurredAt: new Date().toISOString(),
        });
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

    idleBucketSecRef.current = 0;

    if (activeSession && !activeSession.id.startsWith('offline_')) {
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
        await durableOfflineStore.enqueueEvent({
          type: 'SESSION_STOP',
          endpoint: '/agent/work-sessions/sync-offline',
          payload: {
            clientSessionId: activeSession.id,
            startedAt: activeSession.startedAt,
            endedAt: now.toISOString(),
            notes: workNotes || undefined,
          },
          occurredAt: now.toISOString(),
        });
      } else if (syncStatus.isOnline) {
        try {
          await agentApi.stopWorkSession({
            sessionId: activeSession.id,
            notes: workNotes || undefined,
          });
        } catch {
          await durableOfflineStore.enqueueEvent({
            type: 'SESSION_STOP',
            endpoint: '/agent/work-sessions/stop',
            payload: {
              sessionId: activeSession.id,
              notes: workNotes || undefined,
            },
            occurredAt: now.toISOString(),
          });
        }
      } else {
        await durableOfflineStore.enqueueEvent({
          type: 'SESSION_STOP',
          endpoint: '/agent/work-sessions/stop',
          payload: {
            sessionId: activeSession.id,
            notes: workNotes || undefined,
          },
          occurredAt: now.toISOString(),
        });
      }
    }

    // Save final daily state to employee array
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

    // Clear local in-memory states and update tray
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
    initialCaptureDoneSessionIdRef.current = null;
    window.electronAPI?.updateTrayStatus('Offline');

    // Trigger logout
    onLogout();
  };

  const timeoutMinutes = Math.round(
    ((idleConfig.gracePeriodSeconds || 60) + (idleConfig.warningDurationSeconds || 60)) / 60,
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden select-none bg-[#f4f4f4] text-[#161616] font-sans tracking-carbon">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} isOnline={syncStatus.isOnline} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-[#e0e0e0]">
        {/* Employee Bar & Automatic Sync Status */}
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
            {/* Real-time sync status indicator */}
            {syncStatus.syncState === 'SYNCING' && (
              <div className="px-2 py-1 rounded-none bg-[#edf5ff] border border-[#0f62fe] text-[#0f62fe] text-xs font-medium flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0f62fe]" />
                <span>
                  Syncing {syncStatus.syncedCount > 0 ? `${syncStatus.syncedCount}/${syncStatus.totalToSync}` : '...'}
                </span>
              </div>
            )}

            {syncStatus.syncState === 'SYNC_COMPLETE' && (
              <div className="px-2 py-1 rounded-none bg-[#defbe6] border border-[#24a148] text-[#0e6027] text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#24a148]" />
                <span>Synced</span>
              </div>
            )}

            {syncStatus.syncState === 'DISCONNECTED' && syncStatus.pendingCount > 0 && (
              <div
                className="px-2 py-1 rounded-none bg-[#fdf2cc] border border-[#f1c21b] text-[#6d4f00] text-xs font-medium flex items-center gap-1.5"
                title="Offline: Saved locally and will sync automatically when reconnected."
              >
                <CloudOff className="w-3.5 h-3.5 text-[#6d4f00]" />
                <span>{syncStatus.pendingCount} Queued</span>
              </div>
            )}

            {syncStatus.storageWarning && (
              <div
                className="px-2 py-1 rounded-none bg-[#fff1f1] border border-[#da1e28] text-[#da1e28] text-xs font-medium flex items-center gap-1.5"
                title="Offline storage threshold reached. Data will continue syncing automatically."
              >
                <AlertCircle className="w-3.5 h-3.5 text-[#da1e28]" />
                <span>Storage warning</span>
              </div>
            )}

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
