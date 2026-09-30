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
    <div className="bg-[#262626] border border-[#393939] rounded-none p-5 space-y-4 font-sans tracking-carbon">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-none ${
              isActive
                ? 'bg-[#24a148] animate-ping'
                : isBreak
                ? 'bg-[#f1c21b]'
                : isIdleMode || isIdleWarning
                ? 'bg-[#f1c21b] animate-pulse'
                : 'bg-[#8c8c8c]'
            }`}
          />
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              isActive
                ? 'text-[#24a148]'
                : isBreak
                ? 'text-[#f1c21b]'
                : isIdleMode || isIdleWarning
                ? 'text-[#f1c21b]'
                : 'text-[#8c8c8c]'
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
          <div className="flex items-center gap-1 text-[11px] bg-[#f1c21b]/10 border border-[#f1c21b] text-[#f1c21b] px-2 py-0.5 rounded-none animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            <span>{isIdleMode ? `Idle: ${formatTime(currentIdleDuration)}` : `Idle (${Math.floor(idleSeconds / 60)}m)`}</span>
          </div>
        )}

        {/* Work Notes Button */}
        {status !== 'OFFLINE' && (
          <button
            onClick={onOpenNotes}
            className="text-xs text-[#c6c6c6] hover:text-white flex items-center gap-1.5 bg-[#161616] hover:bg-[#393939] px-2.5 py-1 rounded-none transition-colors border border-[#393939] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#0f62fe]" />
            <span>Memo</span>
          </button>
        )}
      </div>

      {/* Big Digital Timer Display */}
      <div className="text-center py-2">
        <div
          className={`font-mono text-5xl font-light tracking-tight ${
            isIdleMode ? 'text-[#f1c21b]' : isBreak ? 'text-[#f1c21b]' : 'text-[#ffffff]'
          }`}
        >
          {isBreak
            ? formatTime(breakSeconds)
            : isIdleMode
            ? formatTime(currentIdleDuration)
            : formatTime(todayWorkedSeconds)}
        </div>
        <p className="text-xs text-[#8c8c8c] font-normal mt-1.5">
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
            className="col-span-2 py-3 px-4 rounded-none bg-[#0f62fe] hover:bg-[#0043ce] active:bg-[#002d9c] text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{loading ? 'Starting...' : todayWorkedSeconds > 0 ? 'Punch In (Resume Today)' : 'Punch In (Start Work)'}</span>
          </button>
        ) : isIdleMode ? (
          <>
            <button
              onClick={onResumeFromIdle}
              disabled={loading}
              className="py-2.5 px-3 rounded-none bg-[#24a148] hover:bg-[#1e8239] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Resume Work</span>
            </button>

            <button
              onClick={onStopSession}
              disabled={loading}
              className="py-2.5 px-3 rounded-none bg-[#da1e28] hover:bg-[#b81921] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
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
                className="py-2.5 px-3 rounded-none bg-[#24a148] hover:bg-[#1e8239] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Resume Work</span>
              </button>
            ) : (
              <button
                onClick={onStartBreak}
                disabled={loading}
                className="py-2.5 px-3 rounded-none bg-[#161616] hover:bg-[#393939] text-[#f1c21b] font-medium text-xs flex items-center justify-center gap-1.5 border border-[#393939] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Take Break</span>
              </button>
            )}

            <button
              onClick={onStopSession}
              disabled={loading}
              className="py-2.5 px-3 rounded-none bg-[#da1e28] hover:bg-[#b81921] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
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
