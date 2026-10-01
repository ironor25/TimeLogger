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
  offlineStore: {
    enqueueEvent: (params: {
      type: string;
      endpoint: string;
      payload: any;
      occurredAt?: string;
    }) => Promise<any>;
    saveScreenshot: (params: {
      sessionId: string;
      capturedAt: string;
      fileSize: number;
      mimeType: string;
      width: number;
      height: number;
      activityPercentage: number;
      projectId?: string | null;
      taskId?: string | null;
      buffer?: number[];
      base64?: string;
    }) => Promise<any>;
    getPendingItems: (limit?: number) => Promise<any[]>;
    getPendingCount: () => Promise<number>;
    updateItemStatus: (params: {
      id: string;
      status: string;
      updates?: { errorMessage?: string; retries?: number; sessionId?: string };
    }) => Promise<boolean>;
    readScreenshot: (filePath: string) => Promise<{ base64: string; size: number } | null>;
    removeItem: (id: string) => Promise<boolean>;
    getStorageStats: () => Promise<{
      pendingCount: number;
      screenshotCount: number;
      totalSizeBytes: number;
      totalSizeMB: string;
      warning: boolean;
    }>;
    clearAll: () => Promise<boolean>;
  };
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
  offlineStore: {
    enqueueEvent: (params) => ipcRenderer.invoke('offline:enqueue-event', params),
    saveScreenshot: (params) => ipcRenderer.invoke('offline:save-screenshot', params),
    getPendingItems: (limit) => ipcRenderer.invoke('offline:get-pending-items', limit),
    getPendingCount: () => ipcRenderer.invoke('offline:get-pending-count'),
    updateItemStatus: (params) => ipcRenderer.invoke('offline:update-item-status', params),
    readScreenshot: (filePath) => ipcRenderer.invoke('offline:read-screenshot', filePath),
    removeItem: (id) => ipcRenderer.invoke('offline:remove-item', id),
    getStorageStats: () => ipcRenderer.invoke('offline:get-storage-stats'),
    clearAll: () => ipcRenderer.invoke('offline:clear-all'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

