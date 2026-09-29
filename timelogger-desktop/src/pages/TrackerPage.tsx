import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { TimerCard } from '../components/TimerCard';
import { ProjectTaskSelector } from '../components/ProjectTaskSelector';
import { WorkNotesModal } from '../components/WorkNotesModal';
import { TodayStats } from '../components/TodayStats';
import { RecentScreenshots } from '../components/RecentScreenshots';
import { SettingsModal } from '../components/SettingsModal';
import { agentApi } from '../services/api';
import { storage } from '../services/storage';
import { LogOut } from 'lucide-react';
import { SessionStatus, Project, Task, ActiveSession, CapturedScreenshot } from '../types';

interface TrackerPageProps {
  onLogout: () => void;
}

export const TrackerPage: React.FC<TrackerPageProps> = ({ onLogout }) => {
  const employee = storage.getEmployee();
  const organization = storage.getOrganization();
  const schedule = storage.getSchedule();

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

  // 1. Initial Load & Restore Active Session
  useEffect(() => {
    loadProjectsAndTasks();

    const todayStr = getTodayDateStr();
    const daily = storage.getDailyState();
    if (daily && daily.date === todayStr) {
      setTodayWorkedSeconds(daily.workedSeconds || 0);
      setTodayActiveSeconds(daily.activeSeconds || 0);
      setTodayIdleSeconds(daily.idleSeconds || 0);
      setTodayBreakSeconds(daily.breakSeconds || 0);
      setElapsedSeconds(daily.workedSeconds || 0);
      if (daily.lastPunchOutTime) {
        setLastPunchOutTime(daily.lastPunchOutTime);
      }
    } else {
      storage.setDailyState({
        date: todayStr,
        workedSeconds: 0,
        activeSeconds: 0,
        idleSeconds: 0,
        breakSeconds: 0,
      });
      setTodayWorkedSeconds(0);
      setTodayActiveSeconds(0);
      setTodayIdleSeconds(0);
      setTodayBreakSeconds(0);
      setElapsedSeconds(0);
      setLastPunchOutTime('');
    }

    restoreSession();
  }, []);

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

  const restoreSession = async () => {
    try {
      const todayStr = getTodayDateStr();
      const current = await agentApi.getCurrentSession();
      if (current && (current.status === 'ACTIVE' || current.status === 'PAUSED')) {
        setActiveSession(current);
        if (current.projectId) setSelectedProjectId(current.projectId);
        if (current.taskId) setSelectedTaskId(current.taskId);

        const isPaused = current.status === 'PAUSED';
        setStatus(isPaused ? 'BREAK' : 'ACTIVE');

        // Derive initial elapsed seconds from server start time
        const startMs = new Date(current.startedAt).getTime();
        const nowMs = Date.now();
        const sessionElapsed = Math.max(0, Math.floor((nowMs - startMs) / 1000));

        const daily = storage.getDailyState();
        const baseWorked =
          daily && daily.date === todayStr
            ? Math.max(daily.workedSeconds || 0, sessionElapsed)
            : sessionElapsed;

        setElapsedSeconds(baseWorked);
        setTodayWorkedSeconds(baseWorked);

        window.electronAPI?.updateTrayStatus(isPaused ? 'On Break' : 'Working');
      } else {
        setStatus('OFFLINE');
        setActiveSession(null);
        window.electronAPI?.updateTrayStatus('Offline');
      }
    } catch (err) {
      console.error('Restore session error:', err);
    }
  };

  // 2. High Resolution Timer Loop (1s Tick)
  useEffect(() => {
    const timer = setInterval(async () => {
      const todayStr = getTodayDateStr();

      if (status === 'ACTIVE') {
        setElapsedSeconds((prev) => prev + 1);
        setTodayWorkedSeconds((prev) => {
          const next = prev + 1;
          storage.setDailyState({
            date: todayStr,
            workedSeconds: next,
            activeSeconds: todayActiveSeconds + 1,
            idleSeconds: todayIdleSeconds,
            breakSeconds: todayBreakSeconds,
            lastPunchOutTime,
          });
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
          storage.setDailyState({
            date: todayStr,
            workedSeconds: todayWorkedSeconds,
            activeSeconds: todayActiveSeconds,
            idleSeconds: todayIdleSeconds,
            breakSeconds: next,
            lastPunchOutTime,
          });
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
    }, 60000);

    return () => clearInterval(heartbeatInterval);
  }, [status, activeSession, workNotes]);

  const executeScreenshotCapture = async (sessionId: string) => {
    console.log('========================================');
    console.log('[SCREENSHOT] Pipeline started');
    console.log('[SCREENSHOT] Session:', sessionId);
    console.log('[SCREENSHOT] Time:', new Date().toISOString());

    if (!window.electronAPI) {
      console.error('[SCREENSHOT] electronAPI is NOT available');
      return;
    }

    try {
      console.log('[SCREENSHOT] Step 1: Calling Electron capture...');

      const capture = await window.electronAPI.captureScreenshot();

      console.log('[SCREENSHOT] Step 1 SUCCESS');
      console.log('[SCREENSHOT] width:', capture.width);
      console.log('[SCREENSHOT] height:', capture.height);
      console.log('[SCREENSHOT] fileSize:', capture.fileSize);
      console.log('[SCREENSHOT] mimeType:', capture.mimeType);

      const total = activeBucketSecRef.current + idleBucketSecRef.current;
      const actPct = total > 0 ? Math.round((activeBucketSecRef.current / total) * 100) : 95;

      console.log('[SCREENSHOT] Activity:', actPct);
      console.log('[SCREENSHOT] Step 2: Starting upload pipeline...');

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

      console.log('[SCREENSHOT] Step 2 SUCCESS');
      console.log('[SCREENSHOT] Backend result:', res);

      const newScreenshot: CapturedScreenshot = {
        id: res.id || Math.random().toString(),
        timestamp: capture.capturedAt,
        dataUrl: capture.dataUrl || `data:${capture.mimeType};base64,${capture.base64}`,
        activityPercentage: actPct,
        storageKey: res.storageKey || '',
      };

      setScreenshots((prev) => [newScreenshot, ...prev]);

      console.log('[SCREENSHOT] Pipeline COMPLETED');
      console.log('========================================');

      await window.electronAPI?.notify({
        title: 'Screenshot Uploaded',
        body: `Screenshot uploaded successfully at ${new Date().toLocaleTimeString()}`,
      });
    } catch (err: any) {
      console.error('========================================');
      console.error('[SCREENSHOT] PIPELINE FAILED');
      console.error('[SCREENSHOT] Error:', err);
      console.error('[SCREENSHOT] Message:', err?.message);
      console.error('========================================');

      await window.electronAPI?.notify({
        title: 'Screenshot Failed',
        body: err?.message || 'Unknown screenshot error',
      });
    }
  };

  // 4. Automated Periodic Screenshot Pipeline (Every 10 Seconds)
  useEffect(() => {
    if (status !== 'ACTIVE' || !activeSession) return;

    // Initial instant capture after 2 seconds to give immediate feedback
    const initialTimer = setTimeout(() => {
      executeScreenshotCapture(activeSession.id);
    }, 2000);

    const screenshotIntervalMs = 10 * 1000; // Every 10 seconds
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
      const daily = storage.getDailyState();

      // Check if same day or new day
      let currentBase = todayWorkedSeconds;
      if (!daily || daily.date !== todayStr) {
        currentBase = 0;
        setTodayWorkedSeconds(0);
        setTodayActiveSeconds(0);
        setTodayIdleSeconds(0);
        setTodayBreakSeconds(0);
        setLastPunchOutTime('');
      }

      const session = await agentApi.startWorkSession({
        projectId: selectedProjectId || undefined,
        taskId: selectedTaskId || undefined,
        notes: workNotes || undefined,
      });

      setActiveSession(session);
      setStatus('ACTIVE');
      setElapsedSeconds(currentBase);
      setBreakSeconds(0);

      // Send initial heartbeat to immediately reflect online status
      agentApi
        .sendHeartbeat({
          sessionId: session.id,
          capturedAt: new Date().toISOString(),
          activeSeconds: 1,
          idleSeconds: 0,
          activeApplication: 'Desktop Work Session',
          windowTitle: workNotes || 'PulseTime Client',
        })
        .catch(console.error);

      window.electronAPI?.updateTrayStatus('Working');
      window.electronAPI?.notify({
        title: 'Work Session Started',
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

      const currentWorked = todayWorkedSeconds;
      const currentActive = todayActiveSeconds;
      const currentIdle = todayIdleSeconds;
      const currentBreak = todayBreakSeconds;

      const todayStr = getTodayDateStr();
      storage.setDailyState({
        date: todayStr,
        workedSeconds: currentWorked,
        activeSeconds: currentActive,
        idleSeconds: currentIdle,
        breakSeconds: currentBreak,
        lastPunchOutTime: punchOutStr,
      });

      // Update state simultaneously
      setStatus('OFFLINE');
      setActiveSession(null);
      setLastPunchOutTime(punchOutStr);
      setElapsedSeconds(currentWorked); // Countdown shows recorded time!
      setTodayWorkedSeconds(currentWorked);
      setBreakSeconds(0);

      await agentApi.stopWorkSession({
        sessionId: activeSession.id,
        notes: workNotes || undefined,
      });

      window.electronAPI?.updateTrayStatus('Offline');
      window.electronAPI?.notify({
        title: 'Work Session Stopped',
        body: `Punched out at ${punchOutStr}. Total recorded today: ${Math.floor(currentWorked / 3600)}h ${Math.floor((currentWorked % 3600) / 60)}m`,
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
      await agentApi.startBreak({
        sessionId: activeSession.id,
        reason,
      });

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
      await agentApi.endBreak({ sessionId: activeSession.id });
      setStatus('ACTIVE');
      setBreakSeconds(0);
      window.electronAPI?.updateTrayStatus('Working');
      window.electronAPI?.notify({
        title: 'Work Resumed',
        body: 'Resumed tracking active session.',
      });
    } catch (err: any) {
      alert(err.message || 'Failed to resume work');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden select-none">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} isOnline={true} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
        {/* Employee Bar */}
        <div className="flex items-center justify-between bg-slate-850 border border-slate-800 rounded-xl px-3 py-2 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/30">
              {employee?.firstName?.[0] || employee?.displayName?.[0] || 'U'}
              {employee?.lastName?.[0] || ''}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-100 truncate">{employee?.displayName || 'PulseTime User'}</span>
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
            {lastPunchOutTime && status === 'OFFLINE' && (
              <div className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/60 hidden sm:block">
                Last Punch Out: <span className="text-slate-200 font-semibold">{lastPunchOutTime}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onLogout}
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
        onLogout={onLogout}
      />
    </div>
  );
};
