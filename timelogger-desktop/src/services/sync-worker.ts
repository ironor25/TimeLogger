import { durableOfflineStore, OfflineItem } from './durable-offline-store';
import { agentApi } from './api';
import { storage } from './storage';

export type SyncState = 'CONNECTED' | 'DISCONNECTED' | 'SYNCING' | 'SYNC_COMPLETE' | 'SYNC_ERROR';

export interface SyncStatusInfo {
  isOnline: boolean;
  syncState: SyncState;
  pendingCount: number;
  syncedCount: number;
  totalToSync: number;
  storageWarning: boolean;
  statusMessage: string;
}

type SyncStatusListener = (status: SyncStatusInfo) => void;

class SyncWorkerService {
  private isRunning: boolean = false;
  private isOnline: boolean = navigator.onLine;
  private syncState: SyncState = navigator.onLine ? 'CONNECTED' : 'DISCONNECTED';
  private pendingCount: number = 0;
  private syncedCount: number = 0;
  private totalToSync: number = 0;
  private storageWarning: boolean = false;
  private statusMessage: string = navigator.onLine ? 'Connected' : 'Offline — data will sync automatically';
  private listeners: Set<SyncStatusListener> = new Set();
  private checkTimer: any = null;
  private sessionIdMap: Record<string, string> = {};
  private onSessionMappedCallback?: (oldId: string, newId: string) => void;

  constructor() {
    this.init();
  }

  private init() {
    // Listen to browser / OS connectivity events
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Initial check
    this.updatePendingCount();

    // Start background polling worker (every 12 seconds)
    this.checkTimer = setInterval(() => {
      this.backgroundPulse();
    }, 12000);

    // Initial connectivity probe
    this.probeConnectivity();
  }

  public setSessionMappedCallback(cb: (oldId: string, newId: string) => void) {
    this.onSessionMappedCallback = cb;
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): SyncStatusInfo {
    return {
      isOnline: this.isOnline,
      syncState: this.syncState,
      pendingCount: this.pendingCount,
      syncedCount: this.syncedCount,
      totalToSync: this.totalToSync,
      storageWarning: this.storageWarning,
      statusMessage: this.statusMessage,
    };
  }

  private notify() {
    const status = this.getStatus();
    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch (err) {
        console.warn('[SYNC WORKER] Error notifying listener:', err);
      }
    }
  }

  private async updatePendingCount() {
    try {
      this.pendingCount = await durableOfflineStore.getPendingCount();
      const stats = await durableOfflineStore.getStorageStats();
      this.storageWarning = stats.warning;
      this.notify();
    } catch {
      this.pendingCount = 0;
    }
  }

  private handleNetworkChange(online: boolean) {
    console.log(`[SYNC WORKER] Network change detected: ${online ? 'ONLINE' : 'OFFLINE'}`);
    this.isOnline = online;
    if (!online) {
      this.syncState = 'DISCONNECTED';
      this.statusMessage = 'Offline — data will sync automatically';
      this.notify();
    } else {
      this.probeConnectivity();
    }
  }

  private async probeConnectivity() {
    try {
      const isHealthy = await agentApi.checkHealth();
      this.isOnline = isHealthy;
      if (isHealthy) {
        if (this.syncState !== 'SYNCING') {
          this.syncState = 'CONNECTED';
          this.statusMessage = 'Connected';
          this.notify();
        }
        // Auto start sync if pending items exist
        this.triggerAutoSync();
      } else {
        this.syncState = 'DISCONNECTED';
        this.statusMessage = 'Offline — data will sync automatically';
        this.notify();
      }
    } catch {
      this.isOnline = false;
      this.syncState = 'DISCONNECTED';
      this.statusMessage = 'Offline — data will sync automatically';
      this.notify();
    }
  }

  private async backgroundPulse() {
    await this.updatePendingCount();
    if (this.pendingCount > 0 && !this.isRunning) {
      await this.probeConnectivity();
    }
  }

  public async triggerAutoSync(currentActiveSessionId?: string): Promise<void> {
    if (this.isRunning) return;

    // Do NOT start sync if user is not authenticated
    const { accessToken } = storage.getTokens();
    if (!accessToken) {
      await this.updatePendingCount();
      if (this.isOnline) {
        this.syncState = 'CONNECTED';
        this.statusMessage = 'Connected';
        this.notify();
      }
      return;
    }

    await this.updatePendingCount();
    if (this.pendingCount === 0) {
      if (this.isOnline && this.syncState !== 'SYNC_COMPLETE') {
        this.syncState = 'CONNECTED';
        this.statusMessage = 'Connected';
        this.notify();
      }
      return;
    }

    if (!this.isOnline) return;

    this.isRunning = true;
    this.totalToSync = this.pendingCount;
    this.syncedCount = 0;
    this.syncState = 'SYNCING';
    this.statusMessage = `Syncing offline data (${this.syncedCount}/${this.totalToSync})...`;
    this.notify();

    console.log(`[SYNC WORKER] Starting automatic background sync (${this.totalToSync} items pending)`);

    try {
      let processedAny = false;
      let hasMore = true;

      while (hasMore && this.isOnline) {
        const { accessToken: curToken } = storage.getTokens();
        if (!curToken) {
          console.log('[SYNC WORKER] User logged out during sync, pausing');
          break;
        }

        const batch = await durableOfflineStore.getPendingItems(8);
        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of batch) {
          if (!this.isOnline) break;

          const { accessToken: tokenCheck } = storage.getTokens();
          if (!tokenCheck) break;

          try {
            await this.processItem(item, currentActiveSessionId);
            this.syncedCount++;
            processedAny = true;
            this.statusMessage = `Syncing timeline (${this.syncedCount}/${this.totalToSync})...`;
            this.notify();
          } catch (itemErr: any) {
            const errorMsg = itemErr?.message || String(itemErr);
            console.error(`[SYNC WORKER] Error syncing item ${item.id} (${item.type}):`, errorMsg);

            // If 401 Unauthorized or session expired, halt sync until user logs in
            if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('expired')) {
              console.warn('[SYNC WORKER] Authentication token expired or missing. Halting sync until user logs in.');
              hasMore = false;
              break;
            }

            await this.handleItemError(item, itemErr);
          }
        }

        await this.updatePendingCount();
        if (this.pendingCount === 0) {
          hasMore = false;
        }
      }

      await this.updatePendingCount();

      if (this.pendingCount === 0) {
        this.syncState = 'SYNC_COMPLETE';
        this.statusMessage = '✓ Synced';
        this.notify();
        console.log('[SYNC WORKER] All offline data synchronized successfully.');

        // Revert to Connected after 4 seconds
        setTimeout(() => {
          if (this.syncState === 'SYNC_COMPLETE') {
            this.syncState = 'CONNECTED';
            this.statusMessage = 'Connected';
            this.notify();
          }
        }, 4000);
      } else {
        this.syncState = this.isOnline ? 'CONNECTED' : 'DISCONNECTED';
        this.statusMessage = this.isOnline ? `${this.pendingCount} items pending sync` : 'Offline — data will sync automatically';
        this.notify();
      }
    } catch (err: any) {
      console.warn('[SYNC WORKER] Sync run encountered an error:', err?.message || err);
      this.syncState = 'SYNC_ERROR';
      this.statusMessage = 'Sync error — retrying automatically';
      this.notify();
    } finally {
      this.isRunning = false;
    }
  }

  private async processItem(item: OfflineItem, currentActiveSessionId?: string): Promise<void> {
    await durableOfflineStore.updateItemStatus({
      id: item.id,
      status: 'UPLOADING',
    });

    if (item.type === 'SESSION_START' || item.type === 'SESSION_STOP') {
      const res = await agentApi.syncOfflineSession(item.payload);
      if (item.payload?.clientSessionId && res?.id) {
        this.sessionIdMap[item.payload.clientSessionId] = res.id;
        if (this.onSessionMappedCallback) {
          this.onSessionMappedCallback(item.payload.clientSessionId, res.id);
        }
      }
      await durableOfflineStore.removeItem(item.id);
      console.log(`[SYNC WORKER] Synchronized ${item.type} [${item.id}] successfully`);
      return;
    }

    if (item.type === 'SESSION_BREAK_START' || item.type === 'SESSION_BREAK_END') {
      let payload = { ...item.payload };
      if (payload.sessionId && this.sessionIdMap[payload.sessionId]) {
        payload.sessionId = this.sessionIdMap[payload.sessionId];
      } else if (payload.sessionId?.startsWith('offline_') && currentActiveSessionId && !currentActiveSessionId.startsWith('offline_')) {
        payload.sessionId = currentActiveSessionId;
      }

      if (item.type === 'SESSION_BREAK_START') {
        await agentApi.startBreak(payload);
      } else {
        await agentApi.endBreak(payload);
      }

      await durableOfflineStore.removeItem(item.id);
      console.log(`[SYNC WORKER] Synchronized break event [${item.id}] successfully`);
      return;
    }

    if (item.type === 'HEARTBEAT') {
      let payload = { ...item.payload };
      if (payload.sessionId && this.sessionIdMap[payload.sessionId]) {
        payload.sessionId = this.sessionIdMap[payload.sessionId];
      } else if (payload.sessionId?.startsWith('offline_') && currentActiveSessionId && !currentActiveSessionId.startsWith('offline_')) {
        payload.sessionId = currentActiveSessionId;
      }

      if (payload.sessionId?.startsWith('offline_')) {
        // Wait for session mapping before uploading heartbeat
        await durableOfflineStore.updateItemStatus({
          id: item.id,
          status: 'PENDING',
        });
        return;
      }

      await agentApi.sendHeartbeat(payload);
      await durableOfflineStore.removeItem(item.id);
      console.log(`[SYNC WORKER] Synchronized heartbeat [${item.id}] successfully`);
      return;
    }

    if (item.type === 'SCREENSHOT') {
      let targetSessionId = item.sessionId ? (this.sessionIdMap[item.sessionId] || item.sessionId) : '';
      if (targetSessionId.startsWith('offline_') && currentActiveSessionId && !currentActiveSessionId.startsWith('offline_')) {
        targetSessionId = currentActiveSessionId;
      }

      if (!targetSessionId || targetSessionId.startsWith('offline_')) {
        // Wait for session sync
        await durableOfflineStore.updateItemStatus({
          id: item.id,
          status: 'PENDING',
        });
        return;
      }

      // Read image data from disk or memory
      const fileData = await durableOfflineStore.readScreenshot(item);
      if (!fileData || !fileData.base64) {
        console.warn(`[SYNC WORKER] Screenshot file missing for item ${item.id}, discarding`);
        await durableOfflineStore.removeItem(item.id);
        return;
      }

      // Upload through standard 3-step screenshot pipeline
      await agentApi.uploadScreenshotPipeline({
        sessionId: targetSessionId,
        base64: fileData.base64,
        fileSize: fileData.size || item.fileSize || 0,
        mimeType: item.mimeType || 'image/jpeg',
        width: item.width || 1280,
        height: item.height || 720,
        activityPercentage: item.activityPercentage ?? 100,
        capturedAt: item.capturedAt || item.createdAt,
        projectId: item.projectId,
        taskId: item.taskId,
      });

      // Confirm and clean up local file
      await durableOfflineStore.removeItem(item.id);
      console.log(`[SYNC WORKER] Synchronized screenshot [${item.id}] and removed local file successfully`);
      return;
    }
  }

  private async handleItemError(item: OfflineItem, err: any) {
    const errorMsg = err?.message || String(err);
    const retries = (item.retries || 0) + 1;

    // Drop stale / invalid heartbeats or permanently failing items after 3 retries
    if (
      retries >= 3 &&
      (errorMsg.includes('not found') ||
        errorMsg.includes('404') ||
        errorMsg.includes('does not belong') ||
        errorMsg.includes('Forbidden') ||
        errorMsg.includes('403') ||
        item.type === 'HEARTBEAT')
    ) {
      console.warn(`[SYNC WORKER] Dropping permanently failed item ${item.id} (${item.type}): ${errorMsg}`);
      await durableOfflineStore.removeItem(item.id);
      return;
    }

    await durableOfflineStore.updateItemStatus({
      id: item.id,
      status: 'PENDING',
      updates: {
        retries,
        errorMessage: errorMsg,
      },
    });
  }
}

export const syncWorker = new SyncWorkerService();
