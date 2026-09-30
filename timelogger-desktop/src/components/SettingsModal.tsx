import React, { useState, useEffect } from 'react';
import { X, Server, Laptop, RefreshCw, LogOut, CheckCircle2, AlertCircle, ShieldAlert, Zap, Clock } from 'lucide-react';
import { storage } from '../services/storage';
import { agentApi } from '../services/api';
import { IdleConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onIdleConfigChange?: (config: IdleConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onLogout,
  onIdleConfigChange,
}) => {
  const [serverUrl, setServerUrl] = useState(storage.getServerUrl());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const getCombinedOfflineCount = () => {
    return storage.getOfflineQueue().length + storage.getOfflineScreenshots().length;
  };

  const [offlineCount, setOfflineCount] = useState(getCombinedOfflineCount);
  const [isSyncing, setIsSyncing] = useState(false);
  const [idleConfig, setIdleConfig] = useState<IdleConfig>(storage.getIdleConfig());

  useEffect(() => {
    if (isOpen) {
      setServerUrl(storage.getServerUrl());
      setOfflineCount(getCombinedOfflineCount());
      setIdleConfig(storage.getIdleConfig());
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

  const handleToggleTestMode = () => {
    const newConfig: IdleConfig = idleConfig.isTestMode
      ? {
          gracePeriodSeconds: 60,
          warningDurationSeconds: 60,
          isTestMode: false,
        }
      : {
          gracePeriodSeconds: 10,
          warningDurationSeconds: 10,
          isTestMode: true,
        };

    setIdleConfig(newConfig);
    storage.setIdleConfig(newConfig);
    if (onIdleConfigChange) {
      onIdleConfigChange(newConfig);
    }
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
      setOfflineCount(getCombinedOfflineCount());
      setTestStatus('success');
      setTestMsg(`Synced ${count} queued items to server!`);
    } catch {
      setTestStatus('error');
      setTestMsg('Failed to sync offline items. Check connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearOfflineData = () => {
    storage.clearAllOfflineData();
    setOfflineCount(0);
    setTestStatus('success');
    setTestMsg('Offline cache cleared successfully.');
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Desktop Settings</h3>
              <p className="text-[10px] text-slate-400">Configure connection and idle tracking preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Idle Detection & Fast Testing Mode */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Idle Detection Mode</span>
            </div>

            <button
              type="button"
              onClick={handleToggleTestMode}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                idleConfig.isTestMode
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{idleConfig.isTestMode ? 'Fast Test (10s/10s)' : 'Standard (60s/60s)'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between">
              <span>Grace Period:</span>
              <span className="font-semibold text-slate-200">{idleConfig.gracePeriodSeconds} seconds</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Warning Countdown:</span>
              <span className="font-semibold text-amber-300">{idleConfig.warningDurationSeconds} seconds</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-1 text-[10px] text-slate-400">
              <span>Total Idle Timeout:</span>
              <span className="font-bold text-slate-100">
                {idleConfig.gracePeriodSeconds + idleConfig.warningDurationSeconds} seconds ({Math.round((idleConfig.gracePeriodSeconds + idleConfig.warningDurationSeconds) / 60)} min)
              </span>
            </div>
          </div>
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
              placeholder="https://timelogger-dy6t.onrender.com/api/v1"
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
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2 text-xs text-amber-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{offlineCount} offline item(s) pending</div>
                <div className="text-[10px] text-amber-400/80">
                  {storage.getOfflineQueue().length} telemetry / events • {storage.getOfflineScreenshots().length} screenshots
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClearOfflineData}
                  type="button"
                  title="Clear any orphaned offline data"
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 text-[10px] font-medium transition-all"
                >
                  Clear
                </button>
                <button
                  onClick={handleSyncOfflineQueue}
                  disabled={isSyncing}
                  type="button"
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] transition-all"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
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
