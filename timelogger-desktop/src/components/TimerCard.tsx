import React from 'react';
import { Play, Square, Coffee, PlayCircle, FileText, AlertTriangle, UserCheck } from 'lucide-react';
import { SessionStatus } from '../types';

interface TimerCardProps {
  status: SessionStatus;
  sessionSeconds: number;
  todayWorkedSeconds: number;
  breakSeconds: number;
  isIdle: boolean;
  idleSeconds: number;
  currentIdleDuration: number;
  loading: boolean;
  lastPunchOutTime?: string;
  onStartSession: () => void;
  onStopSession: () => void;
  onStartBreak: () => void;
  onEndBreak: () => void;
  onResumeFromIdle: () => void;
  onOpenNotes: () => void;
}

export const TimerCard: React.FC<TimerCardProps> = ({
  status,
  sessionSeconds,
  todayWorkedSeconds,
  breakSeconds,
  isIdle,
  idleSeconds,
  currentIdleDuration,
  loading,
  lastPunchOutTime,
  onStartSession,
  onStopSession,
  onStartBreak,
  onEndBreak,
  onResumeFromIdle,
  onOpenNotes,
}) => {
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHoursMins = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const isActive = status === 'ACTIVE';
  const isBreak = status === 'BREAK';
  const isIdleMode = status === 'IDLE';
  const isIdleWarning = status === 'IDLE_WARNING';

  return (
    <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 backdrop-blur-sm shadow-xl space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isActive
                ? 'bg-emerald-500 animate-ping'
                : isBreak
                ? 'bg-amber-400'
                : isIdleMode || isIdleWarning
                ? 'bg-amber-500 animate-pulse'
                : 'bg-slate-500'
            }`}
          />
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              isActive
                ? 'text-emerald-400'
                : isBreak
                ? 'text-amber-400'
                : isIdleMode || isIdleWarning
                ? 'text-amber-400'
                : 'text-slate-400'
            }`}
          >
            {isActive
              ? 'Working'
              : isBreak
              ? 'On Break'
              : isIdleMode
              ? 'IDLE (Inactivity)'
              : isIdleWarning
              ? 'Idle Warning'
              : 'Offline'}
          </span>
        </div>

        {/* Idle Badge indicator */}
        {(isIdleMode || (isActive && isIdle)) && (
          <div className="flex items-center gap-1 text-[11px] bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            <span>{isIdleMode ? `Idle: ${formatTime(currentIdleDuration)}` : `Idle (${Math.floor(idleSeconds / 60)}m)`}</span>
          </div>
        )}

        {/* Work Notes Button */}
        {status !== 'OFFLINE' && (
          <button
            onClick={onOpenNotes}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded-lg transition-colors border border-slate-600/40 cursor-pointer"
          >
            <FileText className="w-3 h-3 text-blue-400" />
            <span>Memo</span>
          </button>
        )}
      </div>

      {/* Big Digital Timer Display */}
      <div className="text-center py-2">
        <div
          className={`font-mono text-4xl font-extrabold tracking-tight drop-shadow-sm ${
            isIdleMode ? 'text-amber-400' : isBreak ? 'text-amber-300' : 'text-white'
          }`}
        >
          {isBreak
            ? formatTime(breakSeconds)
            : isIdleMode
            ? formatTime(currentIdleDuration)
            : formatTime(todayWorkedSeconds)}
        </div>
        <p className="text-[11px] text-slate-400 font-medium mt-1">
          {isBreak
            ? `On Break (${formatHoursMins(breakSeconds)}) • Today Total: ${formatHoursMins(todayWorkedSeconds)}`
            : isIdleMode
            ? `Current Idle Period: ${formatHoursMins(currentIdleDuration)} • Total Worked: ${formatHoursMins(todayWorkedSeconds)}`
            : isIdleWarning
            ? `Inactivity Warning in progress • Total Worked: ${formatHoursMins(todayWorkedSeconds)}`
            : isActive
            ? `Active Shift: ${formatHoursMins(sessionSeconds)} • Today Total: ${formatHoursMins(todayWorkedSeconds)}`
            : lastPunchOutTime
            ? `Last Out: ${lastPunchOutTime} • Previous Total: ${formatHoursMins(todayWorkedSeconds)}`
            : todayWorkedSeconds > 0
            ? `Previous Today Total: ${formatHoursMins(todayWorkedSeconds)}`
            : 'Ready to Punch In'}
        </p>
      </div>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {status === 'OFFLINE' ? (
          <button
            onClick={onStartSession}
            disabled={loading}
            className="col-span-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{loading ? 'Starting...' : todayWorkedSeconds > 0 ? 'Punch In (Resume Today)' : 'Punch In (Start Work)'}</span>
          </button>
        ) : isIdleMode ? (
          <>
            <button
              onClick={onResumeFromIdle}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Resume Work</span>
            </button>

            <button
              onClick={onStopSession}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Punch Out</span>
            </button>
          </>
        ) : (
          <>
            {isBreak ? (
              <button
                onClick={onEndBreak}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Resume Work</span>
              </button>
            ) : (
              <button
                onClick={onStartBreak}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-600/50 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Take Break</span>
              </button>
            )}

            <button
              onClick={onStopSession}
              disabled={loading}
              className="py-2.5 px-3 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Punch Out</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
