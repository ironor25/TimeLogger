import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  hide: () => Promise<void>;
  close: () => Promise<void>;
  setAlwaysOnTop: (flag: boolean) => Promise<boolean>;
  getDeviceInfo: () => Promise<{
    deviceIdentifier: string;
    deviceName: string;
    platform: 'WINDOWS' | 'MACOS' | 'LINUX';
    platformVersion: string;
    appVersion: string;
    cpuModel: string;
    totalMemoryGB: number;
  }>;
  getIdleSeconds: () => Promise<number>;
  captureScreenshot: () => Promise<{
    base64: string;
    dataUrl: string;
    width: number;
    height: number;
    fileSize: number;
    mimeType: string;
    capturedAt: string;
  }>;
  notify: (payload: { title: string; body: string }) => Promise<void>;
  updateTrayStatus: (statusText: string) => Promise<void>;
  // Secure Credentials API
  saveCredentials: (data: any) => Promise<boolean>;
  getCredentials: () => Promise<any>;
  hasCredentials: () => Promise<boolean>;
  clearCredentials: () => Promise<boolean>;
  // Offline Database API
  offlineDb: {
    getPendingCount: () => Promise<{ sessions: number; events: number; screenshots: number; total: number }>;
    saveSession: (session: any) => Promise<any>;
    updateSession: (localSessionId: string, updates: any) => Promise<any>;
    getActiveSession: (employeeId?: string) => Promise<any>;
    getPendingSessions: () => Promise<any[]>;
    markSessionSynced: (localSessionId: string, serverSessionId: string) => Promise<boolean>;
    addEvent: (event: any) => Promise<any>;
    getPendingEvents: () => Promise<any[]>;
    markEventSynced: (eventId: string) => Promise<boolean>;
    incrementEventRetry: (eventId: string) => Promise<boolean>;
    saveScreenshot: (metadata: any, base64Data: string) => Promise<any>;
    getPendingScreenshots: () => Promise<any[]>;
    markScreenshotSynced: (localScreenshotId: string) => Promise<boolean>;
    clearAll: () => Promise<boolean>;
  };
  // Connectivity probe
  probeConnection: (targetUrl: string) => Promise<boolean>;
  // Failsafe & Emergency Stop
  onEmergencyStop: (callback: (reason?: string) => void) => () => void;
}

const api: ElectronAPI = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  hide: () => ipcRenderer.invoke('window:hide'),
  close: () => ipcRenderer.invoke('window:close'),
  setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('window:set-always-on-top', flag),
  getDeviceInfo: () => ipcRenderer.invoke('device:get-info'),
  getIdleSeconds: () => ipcRenderer.invoke('system:get-idle-seconds'),
  captureScreenshot: () => ipcRenderer.invoke('system:capture-screenshot'),
  notify: (payload) => ipcRenderer.invoke('system:notify', payload),
  updateTrayStatus: (statusText) => ipcRenderer.invoke('tray:update-status', statusText),
  // Secure Credentials
  saveCredentials: (data) => ipcRenderer.invoke('credentials:save', data),
  getCredentials: () => ipcRenderer.invoke('credentials:get'),
  hasCredentials: () => ipcRenderer.invoke('credentials:has'),
  clearCredentials: () => ipcRenderer.invoke('credentials:clear'),
  // Offline DB
  offlineDb: {
    getPendingCount: () => ipcRenderer.invoke('offline-db:get-pending-count'),
    saveSession: (session) => ipcRenderer.invoke('offline-db:save-session', session),
    updateSession: (id, updates) => ipcRenderer.invoke('offline-db:update-session', id, updates),
    getActiveSession: (empId) => ipcRenderer.invoke('offline-db:get-active-session', empId),
    getPendingSessions: () => ipcRenderer.invoke('offline-db:get-pending-sessions'),
    markSessionSynced: (localId, serverId) => ipcRenderer.invoke('offline-db:mark-session-synced', localId, serverId),
    addEvent: (event) => ipcRenderer.invoke('offline-db:add-event', event),
    getPendingEvents: () => ipcRenderer.invoke('offline-db:get-pending-events'),
    markEventSynced: (eventId) => ipcRenderer.invoke('offline-db:mark-event-synced', eventId),
    incrementEventRetry: (eventId) => ipcRenderer.invoke('offline-db:increment-event-retry', eventId),
    saveScreenshot: (metadata, base64) => ipcRenderer.invoke('offline-db:save-screenshot', metadata, base64),
    getPendingScreenshots: () => ipcRenderer.invoke('offline-db:get-pending-screenshots'),
    markScreenshotSynced: (id) => ipcRenderer.invoke('offline-db:mark-screenshot-synced', id),
    clearAll: () => ipcRenderer.invoke('offline-db:clear-all'),
  },
  // Connectivity
  probeConnection: (targetUrl) => ipcRenderer.invoke('connectivity:probe', targetUrl),
  // Failsafe Emergency Stop listener
  onEmergencyStop: (callback: (reason?: string) => void) => {
    const handler = (_event: any, reason?: string) => callback(reason);
    ipcRenderer.on('app:emergency-stop', handler);
    return () => {
      ipcRenderer.removeListener('app:emergency-stop', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
