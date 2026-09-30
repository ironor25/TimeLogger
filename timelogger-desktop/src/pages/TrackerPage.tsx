import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from '../components/Header';
import { TimerCard } from '../components/TimerCard';
import { WorkNotesModal } from '../components/WorkNotesModal';
import { TodayStats } from '../components/TodayStats';
import { RecentScreenshots } from '../components/RecentScreenshots';
import { SettingsModal } from '../components/SettingsModal';
import { IdleWarningModal } from '../components/IdleWarningModal';
import { agentApi } from '../services/api';
import { storage } from '../services/storage';
import { LogOut, CloudOff, RefreshCw } from 'lucide-react';
import { SessionStatus, ActiveSession, CapturedScreenshot, IdleConfig } from '../types';

interface TrackerPageProps {
  onLogout: () => void;
}

export const TrackerPage: React.FC<TrackerPageProps> = ({ onLogout }) => {
  const employee = useMemo(() => storage.getEmployee(), []);
  const organization = useMemo(() => storage.getOrganization(), []);
  const schedule = useMemo(() => storage.getSchedule(), []);

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

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

  const updatePendingCount = useCallback(() => {
    const qCount = storage.getOfflineQueue().length;
    const scCount = storage.getOfflineScreenshots().length;
    setPendingSyncCount(qCount + scCount);
  }, []);

  // 1. Initial Load: Load Cached Data and fetch authoritative Summary from DB ONCE
  useEffect(() => {
    const todayStr = getTodayDateStr();
    updatePendingCount();

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
        setTodayWorkedSeconds(summary.workedSeconds ?? summary.activeSeconds ?? 0);
        setTodayActiveSeconds(summary.activeSeconds ?? summary.workedSeconds ?? 0);
        setTodayIdleSeconds(summary.idleSeconds || 0);
        setTodayBreakSeconds(summary.breakSeconds || 0);
        setLastPunchOutTime(summary.lastPunchOutTime || '');

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
  }, []); // Run ONCE on mount

  // Online / Offline & Background Sync Worker
  const runSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    try {
      setIsSyncing(true);
      const res = await agentApi.syncAllOfflineData(
        activeSession?.id,
        (oldId, newId) => {
          if (activeSession?.id === oldId) {
            setActiveSession((prev) => (prev ? { ...prev, id: newId } : prev));
          }
        },
      );
      updatePendingCount();

      if (res.syncedSessions > 0 || res.syncedScreenshots > 0 || res.syncedTelemetry > 0) {
        console.log(`[SYNC] Synced ${res.syncedSessions} sessions, ${res.syncedScreenshots} screenshots`);
        const todayStr = getTodayDateStr();
        const summary = await agentApi.getTodaySummary(todayStr);
        if (summary) {
          setTodayWorkedSeconds(summary.workedSeconds ?? summary.activeSeconds ?? 0);
          setTodayActiveSeconds(summary.activeSeconds ?? summary.workedSeconds ?? 0);
          setTodayBreakSeconds(summary.breakSeconds || 0);
          if (summary.activeSession) {
            setActiveSession(summary.activeSession);
          }
        }
      }
    } catch (err) {
      console.warn('[SYNC] Sync attempt failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updatePendingCount, activeSession]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      runSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        runSync();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [runSync]);

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

      // 2. 1-Second Activity Bucket Classification for Screenshot Window
      if (currentIdle < 2) {
        windowActiveSecondsRef.current += 1;
        activeBucketSecRef.current += 1;
      } else {
        windowIdleSecondsRef.current += 1;
        idleBucketSecRef.current += 1;
      }

      const gracePeriod = idleConfig.gracePeriodSeconds || 60;
      const warningDuration = idleConfig.warningDurationSeconds || 60;
      const totalTimeout = gracePeriod + warningDuration;

      // 3. State Machine Transitions
      if (status === 'ACTIVE') {
        setSessionSeconds((prev) => prev + 1);
        setTodayWorkedSeconds((prev) => prev + 1);
        setTodayActiveSeconds((prev) => prev + 1);

        if (currentIdle >= gracePeriod) {
          // Grace period elapsed -> enter IDLE_WARNING state
          setStatus('IDLE_WARNING');
          const secLeft = Math.max(1, totalTimeout - currentIdle);
          setIdleWarningSecondsLeft(secLeft);
          console.log(`[IDLE] Inactivity started. Grace period elapsed (${gracePeriod}s). Warning started.`);
          window.electronAPI?.notify({
            title: 'PulseTime: Inactivity Warning',
            body: `Inactivity detected. Warning countdown started (${secLeft}s left).`,
          });
        }
      } else if (status === 'IDLE_WARNING') {
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
            title: 'PulseTime: Marked IDLE',
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
        // In confirmed IDLE state: Work timer does NOT increment. Idle timer increments.
        setCurrentIdlePeriodSeconds((prev) => prev + 1);
        setTodayIdleSeconds((prev) => prev + 1);

        if (currentIdle < 2) {
          // User resumed keyboard/mouse interaction!
          const idleDurationSec = idleStartTimeRef.current
            ? Math.max(1, Math.round((Date.now() - idleStartTimeRef.current) / 1000))
            : currentIdlePeriodSeconds;

          console.log(`[IDLE] Activity detected. Idle ended. Confirmed idle duration: ${idleDurationSec}s.`);

          // Record idle telemetry heartbeat
          if (activeSession && !activeSession.id.startsWith('offline_')) {
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
            title: 'PulseTime: Work Resumed',
            body: 'Active work tracking resumed.',
          });
        }
      } else if (status === 'BREAK') {
        setBreakSeconds((prev) => prev + 1);
        setTodayBreakSeconds((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, idleConfig, activeSession]);

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
    if (status === 'OFFLINE' || !activeSession || activeSession.id.startsWith('offline_')) return;

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
          windowTitle: workNotes || 'PulseTime Client',
        });
      } catch (err: any) {
        console.warn('[HEARTBEAT] Warning:', err?.message);
      }
      updatePendingCount();
    }, 60000);

    return () => clearInterval(heartbeatInterval);
  }, [status, activeSession, workNotes, updatePendingCount]);

  // 4. Screenshot Pipeline with 1-Second Activity Bucket Ratio
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

      console.log(
        `[ACTIVITY] Active seconds: ${actSec}, Tracked seconds: ${trackedSec}, Activity percentage: ${actPct}%`,
      );

      // Reset activity accumulators for the next window
      windowActiveSecondsRef.current = 0;
      windowIdleSecondsRef.current = 0;

      if (navigator.onLine && !sessionId.startsWith('offline_')) {
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
          console.warn('[SCREENSHOT] Online upload failed, saving offline:', uploadErr);
        }
      }

      // Save to Offline Screenshot Queue
      storage.addOfflineScreenshot({
        sessionId,
        capturedAt: capture.capturedAt,
        fileSize: capture.fileSize,
        mimeType: capture.mimeType,
        width: capture.width,
        height: capture.height,
        activityPercentage: actPct,
        base64: capture.base64,
        dataUrl: capture.dataUrl,
      });

      updatePendingCount();

      const newScreenshot: CapturedScreenshot = {
        id: `offline_${Date.now()}`,
        timestamp: capture.capturedAt,
        dataUrl: capture.dataUrl || `data:${capture.mimeType};base64,${capture.base64}`,
        activityPercentage: actPct,
        storageKey: 'offline',
      };

      setScreenshots((prev) => [newScreenshot, ...prev.slice(0, 19)]);
    } catch (err: any) {
      console.error('[SCREENSHOT] Capture error:', err);
    }
  };

  // Automated Periodic Screenshot Pipeline (Every 10 Seconds in dev or configured interval)
  useEffect(() => {
    if (status === 'OFFLINE' || status === 'BREAK' || !activeSession) return;

    const initialTimer = setTimeout(() => {
      executeScreenshotCapture(activeSession.id);
    }, 2000);

    const screenshotIntervalMs = 10 * 1000;
    const screenshotTimer = setInterval(() => {
      executeScreenshotCapture(activeSession.id);
    }, screenshotIntervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(screenshotTimer);
    };
  }, [status, activeSession]);

  // Actions
  const handleStartSession = async () => {
    setLoading(true);
    try {
      let session: ActiveSession;

      if (navigator.onLine) {
        try {
          session = await agentApi.startWorkSession({
            notes: workNotes || undefined,
          });
        } catch (netErr: any) {
          console.warn('Network / API response starting session:', netErr);
          // If already active or error occurs, fetch current active server session first
          const current = await agentApi.getCurrentSession().catch(() => null);
          if (current) {
            session = current;
          } else {
            const todaySum = await agentApi.getTodaySummary().catch(() => null);
            if (todaySum?.activeSession) {
              session = todaySum.activeSession;
            } else {
              session = createOfflineSession();
            }
          }
        }
      } else {
        session = createOfflineSession();
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

      // Send initial heartbeat if online
      if (!session.id.startsWith('offline_')) {
        agentApi
          .sendHeartbeat({
            sessionId: session.id,
            capturedAt: new Date().toISOString(),
            activeSeconds: 1,
            idleSeconds: 0,
            activeApplication: 'Desktop Work Session',
            windowTitle: workNotes || 'PulseTime Client',
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

  const createOfflineSession = (): ActiveSession => {
    const offlineId = `offline_sess_${Date.now()}`;
    const startedAt = new Date().toISOString();

    storage.addToOfflineQueue({
      type: 'SESSION_START',
      endpoint: '/agent/work-sessions/sync-offline',
      payload: {
        clientSessionId: offlineId,
        startedAt,
        notes: workNotes || undefined,
      },
    });
    updatePendingCount();

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

      storage.setDailyState(
        {
          date: todayStr,
          workedSeconds: todayWorkedSeconds,
          activeSeconds: todayActiveSeconds,
          idleSeconds: todayIdleSeconds,
          breakSeconds: todayBreakSeconds,
          lastPunchOutTime: punchOutStr,
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

      if (activeSession.id.startsWith('offline_')) {
        storage.addToOfflineQueue({
          type: 'SESSION_STOP',
          endpoint: '/agent/work-sessions/sync-offline',
          payload: {
            clientSessionId: activeSession.id,
            startedAt: activeSession.startedAt,
            endedAt: now.toISOString(),
            notes: workNotes || undefined,
          },
        });
        updatePendingCount();
      } else if (navigator.onLine) {
        try {
          await agentApi.stopWorkSession({
            sessionId: activeSession.id,
            notes: workNotes || undefined,
          });
        } catch {
          storage.addToOfflineQueue({
            type: 'SESSION_STOP',
            endpoint: '/agent/work-sessions/stop',
            payload: {
              sessionId: activeSession.id,
              notes: workNotes || undefined,
            },
          });
          updatePendingCount();
        }
      } else {
        storage.addToOfflineQueue({
          type: 'SESSION_STOP',
          endpoint: '/agent/work-sessions/stop',
          payload: {
            sessionId: activeSession.id,
            notes: workNotes || undefined,
          },
        });
        updatePendingCount();
      }

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
      if (navigator.onLine && !activeSession.id.startsWith('offline_')) {
        await agentApi.startBreak({
          sessionId: activeSession.id,
          reason,
        });
      } else {
        storage.addToOfflineQueue({
          type: 'SESSION_BREAK_START',
          endpoint: '/agent/work-sessions/break/start',
          payload: { sessionId: activeSession.id, reason },
        });
        updatePendingCount();
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
      if (navigator.onLine && !activeSession.id.startsWith('offline_')) {
        await agentApi.endBreak({ sessionId: activeSession.id });
      } else {
        storage.addToOfflineQueue({
          type: 'SESSION_BREAK_END',
          endpoint: '/agent/work-sessions/break/end',
          payload: { sessionId: activeSession.id },
        });
        updatePendingCount();
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

    // 1. If currently in an active session or break or idle, gracefully punch out on the backend first!
    if (activeSession) {
      if (activeSession.id.startsWith('offline_')) {
        storage.addToOfflineQueue({
          type: 'SESSION_STOP',
          endpoint: '/agent/work-sessions/sync-offline',
          payload: {
            clientSessionId: activeSession.id,
            startedAt: activeSession.startedAt,
            endedAt: now.toISOString(),
            notes: workNotes || undefined,
          },
        });
      } else if (navigator.onLine) {
        try {
          await agentApi.stopWorkSession({
            sessionId: activeSession.id,
            notes: workNotes || undefined,
          });
        } catch {
          storage.addToOfflineQueue({
            type: 'SESSION_STOP',
            endpoint: '/agent/work-sessions/stop',
            payload: {
              sessionId: activeSession.id,
              notes: workNotes || undefined,
            },
          });
        }
      } else {
        storage.addToOfflineQueue({
          type: 'SESSION_STOP',
          endpoint: '/agent/work-sessions/stop',
          payload: {
            sessionId: activeSession.id,
            notes: workNotes || undefined,
          },
        });
      }
    }

    // 2. Save final daily state to employee array
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

    // 3. Clear local in-memory states and update tray
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

    // 4. Trigger logout
    onLogout();
  };

  const timeoutMinutes = Math.round(
    ((idleConfig.gracePeriodSeconds || 60) + (idleConfig.warningDurationSeconds || 60)) / 60,
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden select-none bg-[#161616] text-[#f4f4f4] font-sans tracking-carbon">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} isOnline={isOnline} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-[#393939]">
        {/* Employee Bar & Online Status */}
        <div className="flex items-center justify-between bg-[#262626] border border-[#393939] rounded-none px-3 py-2 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-none bg-[#0f62fe] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
              {employee?.firstName?.[0] || employee?.displayName?.[0] || 'U'}
              {employee?.lastName?.[0] || ''}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#ffffff] truncate">
                  {employee?.displayName || 'PulseTime User'}
                </span>
                {employee?.employeeCode && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-none bg-[#161616] text-[#c6c6c6] border border-[#393939]">
                    {employee.employeeCode}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#8c8c8c] truncate">
                {employee?.email ? <span className="text-[#c6c6c6]">{employee.email} • </span> : null}
                {organization?.name || 'Workspace'} • {schedule?.name || 'Standard Shift'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {pendingSyncCount > 0 && (
              <button
                type="button"
                onClick={runSync}
                disabled={isSyncing}
                title="Sync offline records to server"
                className="px-2 py-1 rounded-none bg-[#f1c21b]/10 border border-[#f1c21b] text-[#f1c21b] text-xs font-medium flex items-center gap-1 transition-colors hover:bg-[#f1c21b]/20 cursor-pointer"
              >
                <CloudOff className="w-3.5 h-3.5 text-[#f1c21b]" />
                <span>{isSyncing ? 'Syncing...' : `${pendingSyncCount} Offline`}</span>
                <RefreshCw className={`w-3 h-3 ml-0.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {lastPunchOutTime && status === 'OFFLINE' && (
              <div className="text-[11px] text-[#8c8c8c] bg-[#161616] px-2 py-1 rounded-none border border-[#393939] hidden sm:block">
                Last Out: <span className="text-[#ffffff] font-semibold">{lastPunchOutTime}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogoutWithReset}
              title="Sign out / Switch user"
              className="px-2.5 py-1 rounded-none bg-[#161616] hover:bg-[#da1e28] hover:text-white border border-[#393939] text-[#c6c6c6] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
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
