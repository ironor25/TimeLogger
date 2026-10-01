import React from 'react';
import { Clock, Activity, Coffee, Timer } from 'lucide-react';

interface TodayStatsProps {
  totalWorkedSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  breakSeconds: number;
  screenshotCount?: number;
}

export const TodayStats: React.FC<TodayStatsProps> = ({
  totalWorkedSeconds,
  activeSeconds,
  idleSeconds,
  breakSeconds,
}) => {
  const formatHoursMins = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const totalTracked = activeSeconds + idleSeconds;
  const activePct = totalTracked > 0 ? Math.round((activeSeconds / totalTracked) * 100) : 100;

  // Display pure active time in Worked card (excluding idle and breaks)
  const displayActiveSeconds = activeSeconds !== undefined ? activeSeconds : totalWorkedSeconds;

  return (
    <div className="space-y-2 font-sans tracking-carbon">
      <div className="text-xs font-semibold text-[#525252] uppercase tracking-wider">
        Today's Summary
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* Worked Time (Active hours & minutes only) */}
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-none p-2.5 text-center">
          <div className="flex items-center justify-center text-[#0f62fe] mb-1">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-semibold text-[#161616] font-mono">
            {formatHoursMins(displayActiveSeconds)}
          </div>
          <div className="text-[10px] text-[#525252] font-normal mt-0.5">Worked</div>
        </div>

        {/* Activity % */}
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-none p-2.5 text-center">
          <div className="flex items-center justify-center text-[#24a148] mb-1">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-semibold text-[#24a148] font-mono">
            {activePct}%
          </div>
          <div className="text-[10px] text-[#525252] font-normal mt-0.5">Activity</div>
        </div>

        {/* Break Time */}
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-none p-2.5 text-center">
          <div className="flex items-center justify-center text-[#f1c21b] mb-1">
            <Coffee className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-semibold text-[#6d4f00] font-mono">
            {formatHoursMins(breakSeconds)}
          </div>
          <div className="text-[10px] text-[#525252] font-normal mt-0.5">Breaks</div>
        </div>

        {/* Idle Time Logged */}
        <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-none p-2.5 text-center">
          <div className="flex items-center justify-center text-[#da1e28] mb-1">
            <Timer className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-semibold text-[#da1e28] font-mono">
            {formatHoursMins(idleSeconds)}
          </div>
          <div className="text-[10px] text-[#525252] font-normal mt-0.5">Idle</div>
        </div>
      </div>
    </div>
  );
};
