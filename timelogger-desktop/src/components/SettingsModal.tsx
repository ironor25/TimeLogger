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
    <div className="fixed inset-0 z-50 bg-[#161616]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#262626] border border-[#393939] rounded-none w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto font-sans tracking-carbon">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#393939] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-none bg-[#0f62fe]/20 text-[#0f62fe] flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#ffffff]">Desktop Settings</h3>
              <p className="text-[10px] text-[#8c8c8c]">Configure connection and idle tracking preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8c8c8c] hover:text-white p-1 rounded-none hover:bg-[#393939] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Idle Detection & Fast Testing Mode */}
        <div className="bg-[#161616] border border-[#393939] rounded-none p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-[#ffffff] text-xs">
              <ShieldAlert className="w-4 h-4 text-[#f1c21b]" />
              <span>Idle Detection Mode</span>
            </div>

            <button
              type="button"
              onClick={handleToggleTestMode}
              className={`px-2.5 py-1 rounded-none text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                idleConfig.isTestMode
                  ? 'bg-[#0f62fe] text-white hover:bg-[#0043ce]'
                  : 'bg-[#262626] text-[#c6c6c6] hover:bg-[#393939] border border-[#393939]'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{idleConfig.isTestMode ? 'Fast Test (10s/10s)' : 'Standard (60s/60s)'}</span>
            </button>
          </div>

          <div className="text-xs text-[#8c8c8c] space-y-1 bg-[#262626] p-2.5 rounded-none border border-[#393939]">
            <div className="flex items-center justify-between">
              <span>Grace Period:</span>
              <span className="font-semibold text-[#ffffff]">{idleConfig.gracePeriodSeconds} seconds</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Warning Countdown:</span>
              <span className="font-semibold text-[#f1c21b]">{idleConfig.warningDurationSeconds} seconds</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#393939] pt-1 text-[11px] text-[#8c8c8c]">
              <span>Total Idle Timeout:</span>
              <span className="font-semibold text-[#ffffff]">
                {idleConfig.gracePeriodSeconds + idleConfig.warningDurationSeconds} seconds ({Math.round((idleConfig.gracePeriodSeconds + idleConfig.warningDurationSeconds) / 60)} min)
              </span>
            </div>
          </div>
        </div>

        {/* Server Endpoint URL */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#c6c6c6] flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-[#0f62fe]" />
            <span>API Server Endpoint</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="flex-1 bg-[#161616] border border-[#393939] rounded-none px-3 py-2 text-xs text-[#ffffff] font-mono focus:outline-none focus:border-[#0f62fe] transition-colors"
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
            <div className="flex items-center gap-1.5 text-xs text-[#24a148] bg-[#24a148]/10 border border-[#24a148] p-2 rounded-none">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{testMsg}</span>
            </div>
          )}

          {testStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-xs text-[#da1e28] bg-[#da1e28]/10 border border-[#da1e28] p-2 rounded-none">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{testMsg}</span>
            </div>
          )}
        </div>

        {/* Device Information Card */}
        <div className="bg-[#161616] border border-[#393939] rounded-none p-3 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[#ffffff] text-[11px]">
            <Laptop className="w-3.5 h-3.5 text-[#8c8c8c]" />
            <span>Registered Device Info</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8c8c8c]">
            <div>
              <span className="text-[#8c8c8c] block text-[10px]">Device:</span>
              <span className="text-[#ffffff] font-medium">
                {deviceInfo?.deviceName || 'Local Workstation'}
              </span>
            </div>
            <div>
              <span className="text-[#8c8c8c] block text-[10px]">OS Platform:</span>
              <span className="text-[#ffffff] font-medium">
                {deviceInfo?.platformVersion || 'Windows 11'}
              </span>
            </div>
          </div>
        </div>

        {/* Offline Queue */}
        {offlineCount > 0 && (
          <div className="bg-[#f1c21b]/10 border border-[#f1c21b] rounded-none p-3 space-y-2 text-xs text-[#f1c21b]">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{offlineCount} offline item(s) pending</div>
                <div className="text-[10px] text-[#f1c21b]/80">
                  {storage.getOfflineQueue().length} telemetry / events • {storage.getOfflineScreenshots().length} screenshots
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleClearOfflineData}
                  type="button"
                  title="Clear any orphaned offline data"
                  className="px-2 py-1 rounded-none bg-[#161616] hover:bg-[#da1e28] text-[#c6c6c6] hover:text-white border border-[#393939] text-[10px] font-medium transition-colors cursor-pointer"
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
        <div className="flex items-center justify-between pt-2 border-t border-[#393939]">
          <button
            onClick={onLogout}
            className="text-xs text-[#da1e28] hover:text-[#ff8389] flex items-center gap-1.5 py-1.5 px-3 rounded-none hover:bg-[#da1e28]/10 transition-colors font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>

          <button
            onClick={onClose}
            className="py-2 px-4 rounded-none bg-[#161616] hover:bg-[#393939] text-[#ffffff] border border-[#393939] text-xs font-normal transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
