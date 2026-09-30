import React, { useEffect } from 'react';
import { AlertTriangle, MousePointer, Activity } from 'lucide-react';

interface IdleWarningModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  totalWarningDuration: number;
  totalInactivitySeconds: number;
  idleTimeoutMinutes: number;
  onDismiss: () => void;
}

export const IdleWarningModal: React.FC<IdleWarningModalProps> = ({
  isOpen,
  secondsRemaining,
  totalWarningDuration,
  totalInactivitySeconds,
  idleTimeoutMinutes,
  onDismiss,
}) => {
  // Listen for user interaction events in the window to immediately dismiss warning
  useEffect(() => {
    if (!isOpen) return;

    const handleUserInteraction = () => {
      onDismiss();
    };

    window.addEventListener('mousemove', handleUserInteraction);
    window.addEventListener('mousedown', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    window.addEventListener('wheel', handleUserInteraction);

    return () => {
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('mousedown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('wheel', handleUserInteraction);
    };
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  const pctRemaining = Math.min(100, Math.max(0, (secondsRemaining / totalWarningDuration) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-[#161616]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border-2 border-[#f1c21b] rounded-none w-full max-w-sm p-5 space-y-4 text-center font-sans tracking-carbon shadow-2xl">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-none bg-[#fdf2cc] border border-[#f1c21b] flex items-center justify-center text-[#6d4f00]">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Title & Countdown */}
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-[#161616] flex items-center justify-center gap-1.5">
            <Activity className="w-4 h-4 text-[#f1c21b]" />
            <span>Idle Timeout Warning</span>
          </h3>

          <div className="text-3xl font-light text-[#6d4f00] font-mono tracking-tight pt-1">
            {secondsRemaining} {secondsRemaining === 1 ? 'second' : 'seconds'} left
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="w-full bg-[#f4f4f4] rounded-none h-2 overflow-hidden border border-[#e0e0e0]">
          <div
            className="h-full bg-[#f1c21b] rounded-none transition-all duration-300 ease-linear"
            style={{ width: `${pctRemaining}%` }}
          />
        </div>

        {/* TeamLogger-style Clear Message */}
        <div className="bg-[#fdf2cc]/50 border border-[#f1c21b]/60 rounded-none p-3 text-left">
          <p className="text-xs text-[#161616] leading-relaxed">
            Your employer has enabled idle detection for your account and has set your idle timeout to{' '}
            <span className="font-semibold text-[#161616]">{idleTimeoutMinutes} minute{idleTimeoutMinutes > 1 ? 's' : ''}</span>.
            Please use your keyboard, mouse or trackpad within the next{' '}
            <span className="font-bold text-[#6d4f00]">{secondsRemaining} seconds</span> to indicate that you are still actively working.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-3 px-4 rounded-none bg-[#0f62fe] hover:bg-[#0043ce] active:bg-[#002d9c] text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <MousePointer className="w-4 h-4" />
          <span>I'm Working (Keep Active)</span>
        </button>

        <p className="text-[11px] text-[#525252]">
          Moving your mouse or pressing any key will automatically dismiss this warning.
        </p>
      </div>
    </div>
  );
};
