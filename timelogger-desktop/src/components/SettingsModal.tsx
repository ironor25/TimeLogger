import React, { useState, useEffect } from 'react';
import { X, Server, Laptop, RefreshCw, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { storage } from '../services/storage';
import { agentApi } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onLogout }) => {
  const [serverUrl, setServerUrl] = useState(storage.getServerUrl());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [offlineCount, setOfflineCount] = useState(storage.getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setServerUrl(storage.getServerUrl());
      setOfflineCount(storage.getOfflineQueue().length);
      if (window.electronAPI) {
        window.electronAPI.getDeviceInfo().then(setDeviceInfo);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveUrl = () => {
    storage.setServerUrl(serverUrl);
    setTestStatus('success');
    setTestMsg('Server endpoint updated successfully!');
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMsg('');
    try {
      const cleanUrl = serverUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/health`);
      if (res.ok) {
        setTestStatus('success');
        setTestMsg('Connected to PulseTime Server successfully!');
      } else {
        setTestStatus('error');
        setTestMsg(`Server returned HTTP ${res.status}`);
      }
    } catch {
      setTestStatus('error');
      setTestMsg('Unable to connect. Check server address or network connection.');
    }
  };

  const handleSyncOfflineQueue = async () => {
    setIsSyncing(true);
    try {
      const count = await agentApi.flushOfflineQueue();
      setOfflineCount(storage.getOfflineQueue().length);
      setTestStatus('success');
      setTestMsg(`Synced ${count} queued items to server!`);
    } catch {
      setTestStatus('error');
      setTestMsg('Failed to sync offline items. Check connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Desktop Settings</h3>
              <p className="text-[10px] text-slate-400">Configure connection and device preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Server Endpoint URL */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span>API Server Endpoint</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="http://localhost:4000/api/v1"
            />
            <button
              onClick={handleSaveUrl}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              Save
            </button>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
              <span>Test Server Connection</span>
            </button>
          </div>

          {testStatus === 'success' && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{testMsg}</span>
            </div>
          )}

          {testStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{testMsg}</span>
            </div>
          )}
        </div>

        {/* Device Information Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-[11px]">
            <Laptop className="w-3.5 h-3.5 text-slate-400" />
            <span>Registered Device Info</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div>
              <span className="text-slate-500 block text-[10px]">Device:</span>
              <span className="text-slate-200 font-medium">
                {deviceInfo?.deviceName || 'Local Workstation'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">OS Platform:</span>
              <span className="text-slate-200 font-medium">
                {deviceInfo?.platformVersion || 'Windows 11'}
              </span>
            </div>
          </div>
        </div>

        {/* Offline Queue */}
        {offlineCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs text-amber-300">
            <div>
              <div className="font-semibold">{offlineCount} telemetry items cached offline</div>
              <div className="text-[10px] text-amber-400/80">Will auto-sync when connected</div>
            </div>
            <button
              onClick={handleSyncOfflineQueue}
              disabled={isSyncing}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-all"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-red-500/10 transition-colors font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>

          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
