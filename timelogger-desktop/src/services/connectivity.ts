import { storage } from './storage';

export interface ConnectivityStatus {
  isOnline: boolean;
  isBackendReachable: boolean;
}

export const connectivity = {
  isOnlineFast(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  async check(): Promise<ConnectivityStatus> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { isOnline: false, isBackendReachable: false };
    }

    const serverUrl = storage.getServerUrl();

    // 1. Electron probe if available
    if (window.electronAPI?.probeConnection) {
      try {
        const reachable = await window.electronAPI.probeConnection(serverUrl);
        return {
          isOnline: true,
          isBackendReachable: reachable,
        };
      } catch {
        // Fallback to fetch
      }
    }

    // 2. Direct HTTP probe
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${serverUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(async () => {
        return await fetch(serverUrl, {
          method: 'GET',
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);
      return {
        isOnline: true,
        isBackendReachable: res.status < 500,
      };
    } catch {
      return {
        isOnline: true,
        isBackendReachable: false,
      };
    }
  },
};
