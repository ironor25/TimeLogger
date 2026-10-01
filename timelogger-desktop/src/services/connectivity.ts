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
        // Fallback to direct fetch
      }
    }

    // 2. Direct HTTP probe
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const probeUrl = serverUrl.replace(/\/+$/, '');
      const res = await fetch(`${probeUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(async () => {
        return await fetch(probeUrl, {
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
      // If navigator.onLine is true, assume network is online even if probe timed out
      return {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isBackendReachable: false,
      };
    }
  },
};
