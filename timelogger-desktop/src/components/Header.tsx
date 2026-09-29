import React, { useState } from 'react';
import { Minus, X, Pin, PinOff, Settings } from 'lucide-react';

interface HeaderProps {
  onOpenSettings?: () => void;
  isOnline?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, isOnline = true }) => {
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.electronAPI?.minimize) {
      window.electronAPI.minimize();
    } else {
      console.warn('window.electronAPI.minimize not available');
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.electronAPI?.close) {
      window.electronAPI.close();
    } else {
      console.warn('window.electronAPI.close not available');
    }
  };

  const toggleAlwaysOnTop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.electronAPI?.setAlwaysOnTop) {
      const next = !alwaysOnTop;
      await window.electronAPI.setAlwaysOnTop(next);
      setAlwaysOnTop(next);
    }
  };

  const noDragStyle: React.CSSProperties = {
    WebkitAppRegion: 'no-drag',
  } as React.CSSProperties;

  return (
    <header className="h-10 bg-slate-950/90 backdrop-blur border-b border-slate-800 flex items-center justify-between px-3 select-none app-region-drag">
      {/* Brand & Status */}
      <div className="flex items-center gap-2 app-region-no-drag" style={noDragStyle}>
        <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-[10px] tracking-wider shadow-sm shadow-blue-500/30">
          PT
        </div>
        <span className="font-semibold text-xs text-slate-200 tracking-tight">PulseTime</span>

        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-800 text-[10px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-slate-400 font-medium">
            {isOnline ? 'Connected' : 'Offline Mode'}
          </span>
        </div>
      </div>

      {/* Window Actions */}
      <div className="flex items-center gap-1 z-50 pointer-events-auto app-region-no-drag" style={noDragStyle}>
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            style={noDragStyle}
            title="Settings"
            className="w-7 h-7 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={toggleAlwaysOnTop}
          style={noDragStyle}
          title={alwaysOnTop ? 'Disable Always on Top' : 'Keep Window on Top'}
          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
            alwaysOnTop
              ? 'bg-blue-600/20 text-blue-400'
              : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {alwaysOnTop ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={handleMinimize}
          style={noDragStyle}
          title="Minimize"
          className="w-7 h-7 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleClose}
          style={noDragStyle}
          title="Close"
          className="w-7 h-7 rounded hover:bg-red-500/20 hover:text-red-400 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
