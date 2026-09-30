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
    <div className="space-y-2 font-sans tracking-carbon">
      <div className="text-xs font-semibold text-[#8c8c8c] uppercase tracking-wider">
        Today's Summary
      </div>

      <div className="grid grid-cols-4 gap-2">
        {/* Worked Time */}
        <div className="bg-[#262626] border border-[#393939] rounded-none p-2.5 text-center">
          <div className="flex items-center justify-center text-[#0f62fe] mb-1">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-semibold text-[#ffffff] font-mono">
            {formatHoursMins(totalWorkedSeconds)}
          </div>
          <div className="text-[10px] text-[#8c8c8c] font-normal mt-0.5">Worked</div>
        </div>

        {/* Activity % */}
        <div className="bg-[#262626] border border-[#393939] rounded-none p-2.5 text-center">
          <div className="flex items-center justify-center text-[#24a148] mb-1">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-semibold text-[#24a148] font-mono">
            {activePct}%
          </div>
          <div className="text-[10px] text-[#8c8c8c] font-normal mt-0.5">Activity</div>
        </div>

        {/* Break Time */}
        <div className="bg-[#262626] border border-[#393939] rounded-none p-2.5 text-center">
          <div className="flex items-center justify-center text-[#f1c21b] mb-1">
            <Coffee className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-semibold text-[#f1c21b] font-mono">
            {formatHoursMins(breakSeconds)}
          </div>
          <div className="text-[10px] text-[#8c8c8c] font-normal mt-0.5">Breaks</div>
        </div>

        {/* Screenshots */}
        <div className="bg-[#262626] border border-[#393939] rounded-none p-2.5 text-center">
          <div className="flex items-center justify-center text-[#0f62fe] mb-1">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-semibold text-[#ffffff] font-mono">
            {screenshotCount}
          </div>
          <div className="text-[10px] text-[#8c8c8c] font-normal mt-0.5">Captures</div>
        </div>
      </div>
    </div>
  );
};
