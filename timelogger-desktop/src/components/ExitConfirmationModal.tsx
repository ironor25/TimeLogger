import React from 'react';
import { AlertOctagon, Upload, Minimize2, X, Clock, Loader2 } from 'lucide-react';

interface ExitConfirmationModalProps {
  isOpen: boolean;
  sessionSeconds: number;
  todayActiveSeconds: number;
  isUploading: boolean;
  onPunchOutAndExit: () => Promise<void>;
  onMinimizeToTray: () => void;
  onCancel: () => void;
}

export const ExitConfirmationModal: React.FC<ExitConfirmationModalProps> = ({
  isOpen,
  sessionSeconds,
  todayActiveSeconds,
  isUploading,
  onPunchOutAndExit,
  onMinimizeToTray,
  onCancel,
}) => {
  if (!isOpen) return null;

  const formatHMS = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#161616]/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border-2 border-[#da1e28] rounded-none w-full max-w-md p-5 space-y-4 text-left font-sans tracking-carbon shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Close 'X' and Alert Icon */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none bg-[#da1e28]/10 border border-[#da1e28] flex items-center justify-center text-[#da1e28] flex-shrink-0">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#161616]">Timer is Currently Running!</h3>
              <p className="text-xs text-[#525252]">Active work session in progress</p>
            </div>
          </div>
          {!isUploading && (
            <button
              type="button"
              onClick={onCancel}
              className="text-[#525252] hover:text-[#161616] p-1 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Real-time Session Metrics Card */}
        <div className="bg-[#f4f4f4] border border-[#e0e0e0] p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#525252] flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#0f62fe]" />
              Current Session:
            </span>
            <span className="font-mono font-bold text-sm text-[#161616]">
              {formatHMS(sessionSeconds)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs border-t border-[#e0e0e0] pt-2">
            <span className="text-[#525252] font-medium">Today's Active Total:</span>
            <span className="font-mono font-semibold text-xs text-[#24a148]">
              {formatHMS(todayActiveSeconds)}
            </span>
          </div>
        </div>

        {/* Informative Context */}
        <div className="bg-[#fff8f8] border border-[#da1e28]/30 p-2.5 text-xs text-[#525252] space-y-1">
          <p className="font-medium text-[#da1e28]">
            What would you like to do before closing?
          </p>
          <p className="text-[11px] leading-relaxed text-[#525252]">
            Choosing <strong>Upload & Close</strong> will immediately stop your timer, capture a final screenshot, sync your exact tracked time to the server, and terminate the application.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* 1. Primary Action: Upload, Punch Out & Quit */}
          <button
            type="button"
            disabled={isUploading}
            onClick={onPunchOutAndExit}
            className="w-full py-2.5 px-4 bg-[#da1e28] hover:bg-[#ba1b23] active:bg-[#750e13] disabled:opacity-60 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#da1e28]"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading Time & Exiting App...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Time & Close App</span>
              </>
            )}
          </button>

          {/* 2. Secondary Action: Minimize to System Tray */}
          <button
            type="button"
            disabled={isUploading}
            onClick={onMinimizeToTray}
            className="w-full py-2.5 px-4 bg-[#0f62fe] hover:bg-[#0043ce] active:bg-[#002d9c] disabled:opacity-60 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#0f62fe]"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Keep Running in Background (Minimize to Tray)</span>
          </button>

          {/* 3. Cancel */}
          <button
            type="button"
            disabled={isUploading}
            onClick={onCancel}
            className="w-full py-2 px-4 bg-transparent hover:bg-[#e0e0e0] disabled:opacity-60 text-[#161616] font-medium text-xs flex items-center justify-center transition-colors cursor-pointer border border-[#8d8d8d]"
          >
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
