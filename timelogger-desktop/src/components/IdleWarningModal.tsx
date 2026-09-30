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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl w-full max-w-sm p-5 shadow-2xl shadow-amber-500/20 space-y-4 text-center">
        {/* Animated Warning Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7 animate-bounce" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
            </span>
          </div>
        </div>

        {/* Title & Countdown */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-100 flex items-center justify-center gap-1.5">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Idle Timeout Warning</span>
          </h3>

          <div className="text-2xl font-extrabold text-amber-400 font-mono tracking-tight pt-1">
            {secondsRemaining} {secondsRemaining === 1 ? 'second' : 'seconds'} left
          </div>
        </div>

        {/* Countdown Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700/80">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300 ease-linear"
            style={{ width: `${pctRemaining}%` }}
          />
        </div>

        {/* TeamLogger-style Clear Message */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 text-left">
          <p className="text-xs text-slate-300 leading-relaxed">
            Your employer has enabled idle detection for your account and has set your idle timeout to{' '}
            <span className="font-semibold text-amber-300">{idleTimeoutMinutes} minute{idleTimeoutMinutes > 1 ? 's' : ''}</span>.
            Please use your keyboard, mouse or trackpad within the next{' '}
            <span className="font-bold text-amber-400">{secondsRemaining} seconds</span> to indicate that you are still actively working.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <MousePointer className="w-4 h-4" />
          <span>I'm Working (Keep Active)</span>
        </button>

        <p className="text-[10px] text-slate-400">
          Moving your mouse or pressing any key will automatically dismiss this warning.
        </p>
      </div>
    </div>
  );
};
