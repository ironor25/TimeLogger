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
    <div className="space-y-2 font-sans tracking-carbon">
      <div className="text-xs font-semibold text-[#8c8c8c] uppercase tracking-wider flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-[#0f62fe]" />
          <span>Recent Screen Captures</span>
        </span>
        <span className="text-[10px] text-[#8c8c8c] font-normal">Auto 5-min intervals</span>
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
              className="group relative flex-shrink-0 w-24 h-16 rounded-none overflow-hidden border border-[#393939] bg-[#161616] cursor-pointer hover:border-[#0f62fe] transition-colors"
            >
              <img
                src={sc.dataUrl}
                alt="Captured screen"
                className="w-full h-full object-cover group-hover:brightness-75 transition-all"
              />

              {/* Time & Activity Badge */}
              <div className="absolute inset-x-0 bottom-0 bg-[#161616]/90 border-t border-[#393939] px-1 py-0.5 flex items-center justify-between text-[8px] font-mono">
                <span className="text-[#c6c6c6]">{timeStr}</span>
                <span
                  className={`font-semibold ${
                    sc.activityPercentage >= 80
                      ? 'text-[#24a148]'
                      : sc.activityPercentage >= 50
                      ? 'text-[#f1c21b]'
                      : 'text-[#da1e28]'
                  }`}
                >
                  {sc.activityPercentage}%
                </span>
              </div>

              {/* Hover Eye Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#161616]/60">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-[#161616]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-[#262626] border border-[#393939] rounded-none overflow-hidden space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#ffffff]">
                <Camera className="w-4 h-4 text-[#0f62fe]" />
                <span className="font-semibold">
                  Captured at {new Date(selectedPreview.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-[#24a148] font-semibold font-mono">
                  • {selectedPreview.activityPercentage}% Active
                </span>
              </div>
              <button
                onClick={() => setSelectedPreview(null)}
                className="text-[#8c8c8c] hover:text-white p-1 rounded-none hover:bg-[#393939] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-none overflow-hidden border border-[#393939] bg-black">
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
