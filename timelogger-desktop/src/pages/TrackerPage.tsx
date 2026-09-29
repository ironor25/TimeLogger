import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '../components/Header';
import { TimerCard } from '../components/TimerCard';
import { ProjectTaskSelector } from '../components/ProjectTaskSelector';
import { WorkNotesModal } from '../components/WorkNotesModal';
import { TodayStats } from '../components/TodayStats';
import { RecentScreenshots } from '../components/RecentScreenshots';
import { SettingsModal } from '../components/SettingsModal';
import { agentApi } from '../services/api';
import { storage } from '../services/storage';
import { LogOut, CloudOff, RefreshCw } from 'lucide-react';
import { SessionStatus, Project, Task, ActiveSession, CapturedScreenshot } from '../types';

interface TrackerPageProps {
  onLogout: () => void;
}

export const TrackerPage: React.FC<TrackerPageProps> = ({ onLogout }) => {
  const employee = storage.getEmployee();
  const organization = storage.getOrganization();
  const schedule = storage.getSchedule();

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [status, setStatus] = useState<SessionStatus>('OFFLINE');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [lastPunchOutTime, setLastPunchOutTime] = useState<string>('');

  // Today aggregates
  const [todayWorkedSeconds, setTodayWorkedSeconds] = useState(0);
  const [todayActiveSeconds, setTodayActiveSeconds] = useState(0);
  const [todayIdleSeconds, setTodayIdleSeconds] = useState(0);
  const [todayBreakSeconds, setTodayBreakSeconds] = useState(0);
  const [screenshots, setScreenshots] = useState<CapturedScreenshot[]>([]);

  // Projects & Tasks
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const { projectId: lastProjId, taskId: lastTaskId } = storage.getLastProjectAndTask();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(lastProjId || '');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(lastTaskId || '');

  // Modals & UI state
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [workNotes, setWorkNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Telemetry buffer references
  const intervalMinutes = organization?.screenshotIntervalMinutes || 5;
  const idleThreshold = (organization?.idleThresholdMinutes || 5) * 60;
  const activeBucketSecRef = useRef<number>(0);
  const idleBucketSecRef = useRef<number>(0);

  const getTodayDateStr = () => new Date().toISOString().split('T')[0];

  const updatePendingCount = useCallback(() => {
    const qCount = storage.getOfflineQueue().length;
    const scCount = storage.getOfflineScreenshots().length;
    setPendingSyncCount(qCount + scCount);
  }, []);

  // 1. Initial Load & Authoritative Today Summary from DB
  const loadInitialData = useCallback(async () => {
    const todayStr = getTodayDateStr();
    updatePendingCount();

    try {
      // 1. Fetch Authoritative Summary for THIS logged-in Employee from Database
      const summary = await agentApi.getTodaySummary(todayStr);

      if (summary) {
        setTodayWorkedSeconds(summary.workedSeconds || 0);
        setTodayActiveSeconds(summary.activeSeconds || 0);
        setTodayIdleSeconds(summary.idleSeconds || 0);
        setTodayBreakSeconds(summary.breakSeconds || 0);
        setElapsedSeconds(summary.workedSeconds || 0);
        setLastPunchOutTime(summary.lastPunchOutTime || '');

        if (summary.activeSession) {
          setActiveSession(summary.activeSession);
          if (summary.activeSession.projectId) setSelectedProjectId(summary.activeSession.projectId);
          if (summary.activeSession.taskId) setSelectedTaskId(summary.activeSession.taskId);

          const isPaused = summary.activeSession.status === 'PAUSED';
          setStatus(isPaused ? 'BREAK' : 'ACTIVE');
          window.electronAPI?.updateTrayStatus(isPaused ? 'On Break' : 'Working');
        } else {
          setActiveSession(null);
          setStatus('OFFLINE');
          window.electronAPI?.updateTrayStatus('Offline');
        }

        // Cache this user's isolated daily state locally
        storage.setDailyState(
          {
            date: todayStr,
            workedSeconds: summary.workedSeconds || 0,
            activeSeconds: summary.activeSeconds || 0,
            idleSeconds: summary.idleSeconds || 0,
            breakSeconds: summary.breakSeconds || 0,
            lastPunchOutTime: summary.lastPunchOutTime || '',
          },
          employee?.id,
        );
      } else {
        // Fallback to local isolated state if offline or no DB summary
        restoreLocalState(todayStr);
      }
    } catch {
      restoreLocalState(todayStr);
    }

    loadProjectsAndTasks();
  }, [employee?.id, updatePendingCount]);

  const restoreLocalState = (todayStr: string) => {
    const daily = storage.getDailyState(employee?.id);
    if (daily && daily.date === todayStr) {
      setTodayWorkedSeconds(daily.workedSeconds || 0);
      setTodayActiveSeconds(daily.activeSeconds || 0);
      setTodayIdleSeconds(daily.idleSeconds || 0);
      setTodayBreakSeconds(daily.breakSeconds || 0);
      setElapsedSeconds(daily.workedSeconds || 0);
      setLastPunchOutTime(daily.lastPunchOutTime || '');
    } else {
      setTodayWorkedSeconds(0);
      setTodayActiveSeconds(0);
      setTodayIdleSeconds(0);
      setTodayBreakSeconds(0);
      setElapsedSeconds(0);
      setLastPunchOutTime('');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Online / Offline & Background Sync Worker
  const runSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    try {
      setIsSyncing(true);
      const res = await agentApi.syncAllOfflineData();
      updatePendingCount();

      if (res.syncedSessions > 0 || res.syncedScreenshots > 0 || res.syncedTelemetry > 0) {
        console.log(`[SYNC] Synced ${res.syncedSessions} sessions, ${res.syncedScreenshots} screenshots, ${res.syncedTelemetry} telemetry`);
        // Refresh today summary to update DB counts
        const todayStr = getTodayDateStr();
        const summary = await agentApi.getTodaySummary(todayStr);
        if (summary) {
          setTodayWorkedSeconds(summary.workedSeconds || 0);
          setTodayActiveSeconds(summary.activeSeconds || 0);
          setTodayBreakSeconds(summary.breakSeconds || 0);
          if (status === 'OFFLINE') {
            setElapsedSeconds(summary.workedSeconds || 0);
          }
        }
      }
    } catch (err) {
      console.warn('[SYNC] Sync attempt failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, status, updatePendingCount]);

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

    // Periodic sync every 20s
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        runSync();
      }
    }, 20000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [runSync]);

  const loadProjectsAndTasks = async () => {
    try {
      const projList = await agentApi.getProjects();
      setProjects(projList);

      const targetProjId = selectedProjectId || (projList.length > 0 ? projList[0].id : '');
      if (targetProjId) {
        setSelectedProjectId(targetProjId);
        const taskList = await agentApi.getTasks(targetProjId);
        setTasks(taskList);
        if (!selectedTaskId && taskList.length > 0) {
          setSelectedTaskId(taskList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const handleSelectProject = async (projId: string) => {
    setSelectedProjectId(projId);
    setSelectedTaskId('');
    storage.setLastProjectAndTask(projId, '');
    try {
      const taskList = await agentApi.getTasks(projId);
      setTasks(taskList);
      if (taskList.length > 0) {
        setSelectedTaskId(taskList[0].id);
        storage.setLastProjectAndTask(projId, taskList[0].id);
      }
    } catch (err) {
      console.error('Failed to load tasks for project:', err);
    }
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    storage.setLastProjectAndTask(selectedProjectId, taskId);
  };

  // 2. High Resolution Timer Loop (1s Tick)
  useEffect(() => {
    const timer = setInterval(async () => {
      const todayStr = getTodayDateStr();

      if (status === 'ACTIVE') {
        setElapsedSeconds((prev) => prev + 1);
        setTodayWorkedSeconds((prev) => {
          const next = prev + 1;
          storage.setDailyState(
            {
              date: todayStr,
              workedSeconds: next,
              activeSeconds: todayActiveSeconds + 1,
              idleSeconds: todayIdleSeconds,
              breakSeconds: todayBreakSeconds,
              lastPunchOutTime,
            },
            employee?.id,
          );
          return next;
        });

        // Check system idle seconds
        let currentIdle = 0;
        if (window.electronAPI) {
          currentIdle = await window.electronAPI.getIdleSeconds();
        }
        setIdleSeconds(currentIdle);

        if (currentIdle >= idleThreshold) {
          setIsIdle(true);
          idleBucketSecRef.current += 1;
          setTodayIdleSeconds((prev) => prev + 1);
        } else {
          setIsIdle(false);
          activeBucketSecRef.current += 1;
          setTodayActiveSeconds((prev) => prev + 1);
        }
      } else if (status === 'BREAK') {
        setBreakSeconds((prev) => prev + 1);
        setTodayBreakSeconds((prev) => {
          const next = prev + 1;
          storage.setDailyState(
            {
              date: todayStr,
              workedSeconds: todayWorkedSeconds,
              activeSeconds: todayActiveSeconds,
              idleSeconds: todayIdleSeconds,
              breakSeconds: next,
              lastPunchOutTime,
            },
            employee?.id,
          );
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    status,
    idleThreshold,
    todayWorkedSeconds,
    todayActiveSeconds,
    todayIdleSeconds,
    todayBreakSeconds,
    lastPunchOutTime,
    employee?.id,
  ]);

  // 3. Telemetry Heartbeat Scheduler (Every 60s)
  useEffect(() => {
    if (status !== 'ACTIVE' || !activeSession) return;

    const heartbeatInterval = setInterval(async () => {
      const act = activeBucketSecRef.current;
      const idl = idleBucketSecRef.current;

      if (act === 0 && idl === 0) return;

      activeBucketSecRef.current = 0;
      idleBucketSecRef.current = 0;

      await agentApi.sendHeartbeat({
        sessionId: activeSession.id,
        capturedAt: new Date().toISOString(),
        activeSeconds: act,
        idleSeconds: idl,
        activeApplication: 'Desktop Work Session',
        windowTitle: workNotes || 'PulseTime Client',
      });
      updatePendingCount();
    }, 60000);

    return () => clearInterval(heartbeatInterval);
  }, [status, activeSession, workNotes, updatePendingCount]);

  // 4. Screenshot Pipeline with Offline Queuing
  const executeScreenshotCapture = async (sessionId: string) => {
    if (!window.electronAPI) return;

    try {
      const capture = await window.electronAPI.captureScreenshot();
      const total = activeBucketSecRef.current + idleBucketSecRef.current;
      const actPct = total > 0 ? Math.round((activeBucketSecRef.current / total) * 100) : 95;

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
            projectId: selectedProjectId || undefined,
            taskId: selectedTaskId || undefined,
          });

          const newScreenshot: CapturedScreenshot = {
            id: res.id || Math.random().toString(),
            timestamp: capture.capturedAt,
            dataUrl: capture.dataUrl || `data:${capture.mimeType};base64,${capture.base64}`,
            activityPercentage: actPct,
            storageKey: res.storageKey || '',
          };

          setScreenshots((prev) => [newScreenshot, ...prev]);

          await window.electronAPI?.notify({
            title: 'Screenshot Uploaded',
            body: `Screenshot uploaded successfully at ${new Date().toLocaleTimeString()}`,
          });
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
        projectId: selectedProjectId || undefined,
        taskId: selectedTaskId || undefined,
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

      setScreenshots((prev) => [newScreenshot, ...prev]);

      await window.electronAPI?.notify({
        title: 'Screenshot Captured (Offline)',
        body: `Saved locally. Will upload when reconnected.`,
      });
    } catch (err: any) {
      console.error('[SCREENSHOT] Capture error:', err);
    }
  };

  // Automated Periodic Screenshot Pipeline (Every 10 Seconds)
  useEffect(() => {
    if (status !== 'ACTIVE' || !activeSession) return;

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
  }, [status, activeSession, selectedProjectId, selectedTaskId]);

  // Actions
  const handleStartSession = async () => {
    setLoading(true);
    try {
      const todayStr = getTodayDateStr();
      const currentBase = todayWorkedSeconds;

      let session: ActiveSession;

      if (navigator.onLine) {
        try {
          session = await agentApi.startWorkSession({
            projectId: selectedProjectId || undefined,
            taskId: selectedTaskId || undefined,
            notes: workNotes || undefined,
          });
        } catch (netErr) {
          console.warn('Network error starting session, starting offline session:', netErr);
          session = createOfflineSession();
        }
      } else {
        session = createOfflineSession();
      }

      setActiveSession(session);
      setStatus('ACTIVE');
      setElapsedSeconds(currentBase);
      setBreakSeconds(0);

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
        projectId: selectedProjectId || undefined,
        taskId: selectedTaskId || undefined,
        notes: workNotes || undefined,
      },
    });
    updatePendingCount();

    return {
      id: offlineId,
      status: 'ACTIVE',
      startedAt,
      projectId: selectedProjectId || null,
      taskId: selectedTaskId || null,
      notes: workNotes || null,
    };
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    setLoading(true);
    try {
      const now = new Date();
      const punchOutStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const currentWorked = todayWorkedSeconds;
      const todayStr = getTodayDateStr();

      storage.setDailyState(
        {
          date: todayStr,
          workedSeconds: currentWorked,
          activeSeconds: todayActiveSeconds,
          idleSeconds: todayIdleSeconds,
          breakSeconds: todayBreakSeconds,
          lastPunchOutTime: punchOutStr,
        },
        employee?.id,
      );

      setStatus('OFFLINE');
      setActiveSession(null);
      setLastPunchOutTime(punchOutStr);
      setElapsedSeconds(currentWorked);
      setBreakSeconds(0);

      if (activeSession.id.startsWith('offline_')) {
        // Queue offline session completion
        storage.addToOfflineQueue({
          type: 'SESSION_STOP',
          endpoint: '/agent/work-sessions/sync-offline',
          payload: {
            clientSessionId: activeSession.id,
            startedAt: activeSession.startedAt,
            endedAt: now.toISOString(),
            notes: workNotes || undefined,
            projectId: selectedProjectId || undefined,
            taskId: selectedTaskId || undefined,
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
        body: `Punched out at ${punchOutStr}. Recorded: ${Math.floor(currentWorked / 3600)}h ${Math.floor((currentWorked % 3600) / 60)}m`,
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
      setBreakSeconds(0);
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

  const handleLogoutWithReset = () => {
    // Reset local state completely so next login starts totally clean
    setStatus('OFFLINE');
    setActiveSession(null);
    setElapsedSeconds(0);
    setTodayWorkedSeconds(0);
    setTodayActiveSeconds(0);
    setTodayIdleSeconds(0);
    setTodayBreakSeconds(0);
    setScreenshots([]);
    setLastPunchOutTime('');
    onLogout();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden select-none bg-slate-900">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} isOnline={isOnline} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
        {/* Employee Bar & Online Status */}
        <div className="flex items-center justify-between bg-slate-850 border border-slate-800 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/30">
              {employee?.firstName?.[0] || employee?.displayName?.[0] || 'U'}
              {employee?.lastName?.[0] || ''}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-100 truncate">
                  {employee?.displayName || 'PulseTime User'}
                </span>
                {employee?.employeeCode && (
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-blue-400 border border-slate-700">
                    {employee.employeeCode}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {employee?.email ? <span className="text-slate-300">{employee.email} • </span> : null}
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
                className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-medium flex items-center gap-1 transition-all hover:bg-amber-500/20 cursor-pointer"
              >
                <CloudOff className="w-3 h-3 text-amber-400" />
                <span>{isSyncing ? 'Syncing...' : `${pendingSyncCount} Offline`}</span>
                <RefreshCw className={`w-2.5 h-2.5 ml-0.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}

            {lastPunchOutTime && status === 'OFFLINE' && (
              <div className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/60 hidden sm:block">
                Last Punch Out: <span className="text-slate-200 font-semibold">{lastPunchOutTime}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogoutWithReset}
              title="Sign out / Switch user"
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40 border border-slate-700 text-slate-300 text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Live Timer Card */}
        <TimerCard
          status={status}
          elapsedSeconds={elapsedSeconds}
          breakSeconds={breakSeconds}
          isIdle={isIdle}
          idleSeconds={idleSeconds}
          loading={loading}
          lastPunchOutTime={lastPunchOutTime}
          onStartSession={handleStartSession}
          onStopSession={handleStopSession}
          onStartBreak={() => handleStartBreak('Break')}
          onEndBreak={handleEndBreak}
          onOpenNotes={() => setIsNotesModalOpen(true)}
        />

        {/* Project & Task Selector */}
        <ProjectTaskSelector
          projects={projects}
          tasks={tasks}
          selectedProjectId={selectedProjectId}
          selectedTaskId={selectedTaskId}
          onSelectProject={handleSelectProject}
          onSelectTask={handleSelectTask}
          disabled={status === 'BREAK'}
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
      />
    </div>
  );
};
