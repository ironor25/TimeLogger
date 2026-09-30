import React, { useState, useEffect } from 'react';
import { X, Server, Laptop, RefreshCw, LogOut, CheckCircle2, AlertCircle, ShieldAlert, Zap } from 'lucide-react';
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
        setTestMsg('Connected to TimeLogger Server successfully!');
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
    <div className="fixed inset-0 z-50 bg-[#161616]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-none w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto font-sans tracking-carbon shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e0e0e0] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-none bg-[#0f62fe]/10 text-[#0f62fe] flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#161616]">Desktop Settings</h3>
              <p className="text-[10px] text-[#525252]">Configure connection and idle tracking preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#525252] hover:text-[#161616] p-1 rounded-none hover:bg-[#f4f4f4] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Idle Detection & Fast Testing Mode */}
        <div className="bg-[#f4f4f4] border border-[#e0e0e0] rounded-none p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-[#161616] text-xs">
              <ShieldAlert className="w-4 h-4 text-[#6d4f00]" />
              <span>Idle Detection Mode</span>
            </div>

            <button
              type="button"
              onClick={handleToggleTestMode}
              className={`px-2.5 py-1 rounded-none text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                idleConfig.isTestMode
                  ? 'bg-[#0f62fe] text-white hover:bg-[#0043ce]'
                  : 'bg-[#ffffff] text-[#161616] hover:bg-[#e0e0e0] border border-[#e0e0e0]'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{idleConfig.isTestMode ? 'Fast Test (10s/10s)' : 'Standard (60s/60s)'}</span>
            </button>
          </div>

          <div className="text-xs text-[#525252] space-y-1 bg-[#ffffff] p-2.5 rounded-none border border-[#e0e0e0]">
            <div className="flex items-center justify-between">
              <span>Grace Period:</span>
              <span className="font-semibold text-[#161616]">{idleConfig.gracePeriodSeconds} seconds</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Warning Countdown:</span>
              <span className="font-semibold text-[#6d4f00]">{idleConfig.warningDurationSeconds} seconds</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#e0e0e0] pt-1 text-[11px] text-[#525252]">
              <span>Total Idle Timeout:</span>
              <span className="font-semibold text-[#161616]">
                {idleConfig.gracePeriodSeconds + idleConfig.warningDurationSeconds} seconds ({Math.round((idleConfig.gracePeriodSeconds + idleConfig.warningDurationSeconds) / 60)} min)
              </span>
            </div>
          </div>
        </div>

        {/* Server Endpoint URL */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#161616] flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[#0f62fe]" />
            <span>API Server Endpoint</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="flex-1 bg-[#f4f4f4] border border-[#e0e0e0] rounded-none px-3 py-2 text-xs text-[#161616] font-mono focus:outline-none focus:border-[#0f62fe] transition-colors"
              placeholder="https://timelogger-dy6t.onrender.com/api/v1"
            />
            <button
              onClick={handleSaveUrl}
              className="px-3 py-2 rounded-none bg-[#0f62fe] hover:bg-[#0043ce] active:bg-[#002d9c] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Save
            </button>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className="text-xs text-[#0f62fe] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
              <span>Test Server Connection</span>
            </button>
          </div>

          {testStatus === 'success' && (
            <div className="flex items-center gap-1.5 text-xs text-[#24a148] bg-[#defbe6] border border-[#24a148] p-2 rounded-none">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{testMsg}</span>
            </div>
          )}

          {testStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-[#da1e28] bg-[#ffebee] border border-[#da1e28] p-2 rounded-none">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{testMsg}</span>
            </div>
          )}
        </div>

        {/* Device Information Card */}
        <div className="bg-[#f4f4f4] border border-[#e0e0e0] rounded-none p-3 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[#161616] text-[11px]">
            <Laptop className="w-3.5 h-3.5 text-[#525252]" />
            <span>Registered Device Info</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#525252]">
            <div>
              <span className="text-[#8c8c8c] block text-[10px]">Device:</span>
              <span className="text-[#161616] font-medium">
                {deviceInfo?.deviceName || 'Local Workstation'}
              </span>
            </div>
            <div>
              <span className="text-[#8c8c8c] block text-[10px]">OS Platform:</span>
              <span className="text-[#161616] font-medium">
                {deviceInfo?.platformVersion || 'Windows 11'}
              </span>
            </div>
          </div>
        </div>

        {/* Offline Queue */}
        {offlineCount > 0 && (
          <div className="bg-[#fdf2cc] border border-[#f1c21b] rounded-none p-3 space-y-2 text-xs text-[#6d4f00]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{offlineCount} offline item(s) pending</div>
                <div className="text-[10px] text-[#6d4f00]/80">
                  {storage.getOfflineQueue().length} telemetry / events • {storage.getOfflineScreenshots().length} screenshots
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClearOfflineData}
                  type="button"
                  title="Clear any orphaned offline data"
                  className="px-2 py-1 rounded-none bg-[#ffffff] hover:bg-[#da1e28] text-[#161616] hover:text-white border border-[#e0e0e0] text-[10px] font-medium transition-colors cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={handleSyncOfflineQueue}
                  disabled={isSyncing}
                  type="button"
                  className="px-2.5 py-1 rounded-none bg-[#f1c21b] hover:bg-[#d4a810] text-[#161616] font-semibold text-[10px] transition-colors cursor-pointer"
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e0e0e0]">
          <button
            onClick={onLogout}
            className="text-xs text-[#da1e28] hover:text-[#b81921] flex items-center gap-1.5 py-1.5 px-3 rounded-none hover:bg-[#ffebee] transition-colors font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>

          <button
            onClick={onClose}
            className="py-2 px-4 rounded-none bg-[#f4f4f4] hover:bg-[#e0e0e0] text-[#161616] border border-[#e0e0e0] text-xs font-normal transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
