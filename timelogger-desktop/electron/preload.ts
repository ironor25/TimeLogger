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
};

contextBridge.exposeInMainWorld('electronAPI', api);
