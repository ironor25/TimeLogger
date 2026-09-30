import React, { useState } from 'react';
import { Minus, X, Pin, PinOff, Settings } from 'lucide-react';
import appLogo from '../assets/icon.png';

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
    <header className="h-10 bg-[#ffffff] border-b border-[#e0e0e0] flex items-center justify-between px-3 select-none app-region-drag font-sans tracking-carbon">
      {/* Brand & Status */}
      <div className="flex items-center gap-2 app-region-no-drag" style={noDragStyle}>
        <img src={appLogo} alt="TimeLogger" className="w-5 h-5 rounded-none object-contain flex-shrink-0" />
        <span className="font-semibold text-xs text-[#161616] tracking-tight">TimeLogger</span>

        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-[#e0e0e0] text-[10px]">
          <span
            className={`w-1.5 h-1.5 rounded-none ${
              isOnline ? 'bg-[#24a148] animate-pulse' : 'bg-[#f1c21b]'
            }`}
          />
          <span className="text-[#525252] font-medium">
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
            className="w-7 h-7 rounded-none hover:bg-[#f4f4f4] text-[#525252] hover:text-[#161616] flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-[#e0e0e0]"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={toggleAlwaysOnTop}
          style={noDragStyle}
          title={alwaysOnTop ? 'Disable Always on Top' : 'Keep Window on Top'}
          className={`w-7 h-7 rounded-none flex items-center justify-center transition-colors cursor-pointer border ${
            alwaysOnTop
              ? 'bg-[#0f62fe] text-white border-[#0f62fe]'
              : 'hover:bg-[#f4f4f4] text-[#525252] hover:text-[#161616] border-transparent hover:border-[#e0e0e0]'
          }`}
        >
          {alwaysOnTop ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={handleMinimize}
          style={noDragStyle}
          title="Minimize"
          className="w-7 h-7 rounded-none hover:bg-[#f4f4f4] text-[#525252] hover:text-[#161616] flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-[#e0e0e0]"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleClose}
          style={noDragStyle}
          title="Close"
          className="w-7 h-7 rounded-none hover:bg-[#da1e28] text-[#525252] hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-transparent"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
