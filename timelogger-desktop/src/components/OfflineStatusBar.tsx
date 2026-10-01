import React from 'react';
import { RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle2 } from 'lucide-react';

export type ConnectionState = 'CONNECTED' | 'OFFLINE' | 'RECONNECTING' | 'SYNCING' | 'ERROR';

interface OfflineStatusBarProps {
  connectionState: ConnectionState;
  pendingCount: number;
  onReconnect: () => void;
  errorMessage?: string;
}

export const OfflineStatusBar: React.FC<OfflineStatusBarProps> = ({
  connectionState,
  pendingCount,
  onReconnect,
  errorMessage,
}) => {
  if (connectionState === 'CONNECTED') {
    return (
      <div className="h-8 bg-[#ffffff] border-t border-[#e0e0e0] px-3 flex items-center justify-between text-xs select-none transition-colors">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#24a148] flex-shrink-0" />
          <span className="text-[#161616] font-medium text-[11px]">Connected</span>
        </div>
        {pendingCount > 0 ? (
          <span className="text-[10px] text-[#525252] font-mono">
            {pendingCount} item{pendingCount > 1 ? 's' : ''} saved locally
          </span>
        ) : (
          <span className="text-[10px] text-[#8c8c8c] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#24a148]" />
            All synced
          </span>
        )}
      </div>
    );
  }

  if (connectionState === 'RECONNECTING') {
    return (
      <div className="h-8 bg-[#edf5ff] border-t border-[#0f62fe] px-3 flex items-center justify-between text-xs select-none animate-pulse">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-[#0f62fe] animate-spin flex-shrink-0" />
          <span className="text-[#0f62fe] font-medium text-[11px]">Connecting...</span>
        </div>
        <span className="text-[10px] text-[#0f62fe]">Checking backend...</span>
      </div>
    );
  }

  if (connectionState === 'SYNCING') {
    return (
      <div className="h-8 bg-[#edf5ff] border-t border-[#0f62fe] px-3 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-[#0f62fe] animate-spin flex-shrink-0" />
          <span className="text-[#0f62fe] font-medium text-[11px]">Syncing offline data...</span>
        </div>
        {pendingCount > 0 && (
          <span className="text-[10px] text-[#0f62fe] font-mono font-medium">
            {pendingCount} remaining
          </span>
        )}
      </div>
    );
  }

  if (connectionState === 'ERROR') {
    return (
      <button
        type="button"
        onClick={onReconnect}
        title="Click to retry connecting"
        className="w-full h-8 bg-[#fff1f1] border-t border-[#da1e28] px-3 flex items-center justify-between text-xs select-none hover:bg-[#ffd7d9] transition-colors cursor-pointer text-left group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-3.5 h-3.5 text-[#da1e28] flex-shrink-0" />
          <span className="text-[#da1e28] font-medium text-[11px] truncate">
            {errorMessage || 'Unable to connect. Click to retry.'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#da1e28] font-semibold flex-shrink-0 group-hover:underline">
          <span>Retry</span>
          <RefreshCw className="w-2.5 h-2.5" />
        </div>
      </button>
    );
  }

  // OFFLINE state
  return (
    <button
      type="button"
      onClick={onReconnect}
      title="Click to reconnect and sync offline data"
      className="w-full h-8 bg-[#fff1f1] hover:bg-[#ffd7d9] border-t border-[#da1e28] px-3 flex items-center justify-between text-xs select-none transition-colors cursor-pointer text-left group"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-[#da1e28] flex-shrink-0 animate-ping" />
        <span className="text-[#da1e28] font-semibold text-[11px] truncate">
          You're offline · Click here to go online
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-[#da1e28] flex-shrink-0">
        {pendingCount > 0 && (
          <span className="font-mono bg-[#da1e28] text-white px-1.5 py-0.2 rounded-none font-bold text-[9px]">
            {pendingCount} pending
          </span>
        )}
        <span className="font-medium group-hover:underline hidden sm:inline">Connect & Sync</span>
        <Wifi className="w-3 h-3 text-[#da1e28]" />
      </div>
    </button>
  );
};
