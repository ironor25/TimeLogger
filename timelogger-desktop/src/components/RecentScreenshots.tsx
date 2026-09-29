import React, { useState } from 'react';
import { Camera, Eye, X } from 'lucide-react';
import { CapturedScreenshot } from '../types';

interface RecentScreenshotsProps {
  screenshots: CapturedScreenshot[];
}

export const RecentScreenshots: React.FC<RecentScreenshotsProps> = ({ screenshots }) => {
  const [selectedPreview, setSelectedPreview] = useState<CapturedScreenshot | null>(null);

  if (screenshots.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-slate-400" />
          <span>Recent Screen Captures</span>
        </span>
        <span className="text-[10px] text-slate-500 font-normal">Auto 5-min intervals</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {screenshots.slice(0, 4).map((sc) => {
          const timeStr = new Date(sc.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={sc.id}
              onClick={() => setSelectedPreview(sc)}
              className="group relative flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-850 cursor-pointer transition-transform hover:scale-105 shadow-sm"
            >
              <img
                src={sc.dataUrl}
                alt="Captured screen"
                className="w-full h-full object-cover group-hover:brightness-75 transition-all"
              />

              {/* Time & Activity Badge */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-1 flex items-center justify-between text-[8px] font-mono">
                <span className="text-slate-300">{timeStr}</span>
                <span
                  className={`font-bold ${
                    sc.activityPercentage >= 80
                      ? 'text-emerald-400'
                      : sc.activityPercentage >= 50
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {sc.activityPercentage}%
                </span>
              </div>

              {/* Hover Eye Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40">
                <Eye className="w-4 h-4 text-white drop-shadow" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Camera className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">
                  Captured at {new Date(selectedPreview.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-emerald-400 font-bold font-mono">
                  • {selectedPreview.activityPercentage}% Active
                </span>
              </div>
              <button
                onClick={() => setSelectedPreview(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black">
              <img
                src={selectedPreview.dataUrl}
                alt="Preview"
                className="w-full h-auto object-contain max-h-72"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
