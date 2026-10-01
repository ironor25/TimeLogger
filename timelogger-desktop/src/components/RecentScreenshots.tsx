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
      <div className="text-xs font-semibold text-[#525252] uppercase tracking-wider flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-[#0f62fe]" />
          <span>Recent Screen Captures</span>
        </span>
        <span className="text-[10px] text-[#525252] font-normal">Auto 5-min intervals</span>
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
              className="group relative flex-shrink-0 w-24 h-16 rounded-none overflow-hidden border border-[#e0e0e0] bg-[#ffffff] cursor-pointer hover:border-[#0f62fe] transition-colors"
            >
              <img
                src={sc.dataUrl}
                alt="Captured screen"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64" fill="%23f4f4f4"><rect width="96" height="64" fill="%23f4f4f4"/><text x="48" y="36" font-family="sans-serif" font-size="9" fill="%238d8d8d" text-anchor="middle">Preview</text></svg>';
                }}
                className="w-full h-full object-cover group-hover:brightness-75 transition-all"
              />

              {/* Time & Activity Badge */}
              <div className="absolute inset-x-0 bottom-0 bg-[#ffffff]/95 border-t border-[#e0e0e0] px-1 py-0.5 flex items-center justify-between text-[8px] font-mono">
                <span className="text-[#161616] font-medium">{timeStr}</span>
                <span
                  className={`font-semibold ${
                    sc.activityPercentage >= 80
                      ? 'text-[#24a148]'
                      : sc.activityPercentage >= 50
                      ? 'text-[#6d4f00]'
                      : 'text-[#da1e28]'
                  }`}
                >
                  {sc.activityPercentage}%
                </span>
              </div>

              {/* Hover Eye Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-[#161616]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-[#ffffff] border border-[#e0e0e0] rounded-none overflow-hidden space-y-3 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#161616]">
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
                className="text-[#525252] hover:text-[#161616] p-1 rounded-none hover:bg-[#f4f4f4] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-none overflow-hidden border border-[#e0e0e0] bg-black">
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
