import React from 'react';
import { Clock, Activity, Coffee, Camera } from 'lucide-react';

interface TodayStatsProps {
  totalWorkedSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  breakSeconds: number;
  screenshotCount: number;
}

export const TodayStats: React.FC<TodayStatsProps> = ({
  totalWorkedSeconds,
  activeSeconds,
  idleSeconds,
  breakSeconds,
  screenshotCount,
}) => {
  const formatHoursMins = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const totalTracked = activeSeconds + idleSeconds;
  const activePct = totalTracked > 0 ? Math.round((activeSeconds / totalTracked) * 100) : 100;

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        Today's Summary
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* Worked Time */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center text-blue-400 mb-1">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-slate-100 font-mono">
            {formatHoursMins(totalWorkedSeconds)}
          </div>
          <div className="text-[9px] text-slate-400 font-medium mt-0.5">Worked</div>
        </div>

        {/* Activity % */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center text-emerald-400 mb-1">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-emerald-400 font-mono">
            {activePct}%
          </div>
          <div className="text-[9px] text-slate-400 font-medium mt-0.5">Activity</div>
        </div>

        {/* Break Time */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center text-amber-400 mb-1">
            <Coffee className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-amber-300 font-mono">
            {formatHoursMins(breakSeconds)}
          </div>
          <div className="text-[9px] text-slate-400 font-medium mt-0.5">Breaks</div>
        </div>

        {/* Screenshots */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center text-purple-400 mb-1">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-purple-300 font-mono">
            {screenshotCount}
          </div>
          <div className="text-[9px] text-slate-400 font-medium mt-0.5">Captures</div>
        </div>
      </div>
    </div>
  );
};
