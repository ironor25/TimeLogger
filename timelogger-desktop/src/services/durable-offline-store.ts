// Durable Offline Store Service (Renderer Process)
// Bridges to Electron Main Process IPC for disk persistence with safe fallback

export interface OfflineItem {
  id: string;
  clientEventId: string;
  type:
    | 'SESSION_START'
    | 'SESSION_STOP'
    | 'SESSION_BREAK_START'
    | 'SESSION_BREAK_END'
    | 'HEARTBEAT'
    | 'SCREENSHOT';
  status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
  priority: number;
  endpoint?: string;
  payload?: any;
  sessionId?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  activityPercentage?: number;
  capturedAt?: string;
  projectId?: string | null;
  taskId?: string | null;
  base64?: string;
  retries: number;
  createdAt: string;
  occurredAt: string;
  lastAttemptAt?: string;
  errorMessage?: string;
}

export const durableOfflineStore = {
  async enqueueEvent(params: {
    type: 'SESSION_START' | 'SESSION_STOP' | 'SESSION_BREAK_START' | 'SESSION_BREAK_END' | 'HEARTBEAT';
    endpoint: string;
    payload: any;
    occurredAt?: string;
  }): Promise<OfflineItem> {
    if (window.electronAPI?.offlineStore) {
      return await window.electronAPI.offlineStore.enqueueEvent(params);
    }

    // Web Fallback
    const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const clientEventId = params.payload?.clientEventId || `cid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const priority = params.type === 'HEARTBEAT' ? 2 : 1;

    const item: OfflineItem = {
      id,
      clientEventId,
      type: params.type,
      status: 'PENDING',
      priority,
      endpoint: params.endpoint,
      payload: { ...params.payload, clientEventId },
      retries: 0,
      createdAt: new Date().toISOString(),
      occurredAt: params.occurredAt || new Date().toISOString(),
    };

    const existing = this.getFallbackItems();
    existing.push(item);
    this.saveFallbackItems(existing);
    return item;
  },

  async enqueueScreenshot(params: {
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
  }): Promise<OfflineItem> {
    if (window.electronAPI?.offlineStore) {
      return await window.electronAPI.offlineStore.saveScreenshot(params);
    }

    // Web Fallback
    const id = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const clientEventId = `sc_cid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const item: OfflineItem = {
      id,
      clientEventId,
      type: 'SCREENSHOT',
      status: 'PENDING',
      priority: 3,
      sessionId: params.sessionId,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      width: params.width,
      height: params.height,
      activityPercentage: params.activityPercentage,
      capturedAt: params.capturedAt,
      projectId: params.projectId || null,
      taskId: params.taskId || null,
      base64: params.base64,
      retries: 0,
      createdAt: new Date().toISOString(),
      occurredAt: params.capturedAt,
    };

    const existing = this.getFallbackItems();
    existing.push(item);
    this.saveFallbackItems(existing);
    return item;
  },

  async getPendingItems(limit: number = 20): Promise<OfflineItem[]> {
    if (window.electronAPI?.offlineStore) {
      return await window.electronAPI.offlineStore.getPendingItems(limit);
    }

    const list = this.getFallbackItems();
    return list
      .filter((i) => i.status === 'PENDING')
      .sort((a, b) => (a.priority - b.priority) || (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
      .slice(0, limit);
  },

  async getPendingCount(): Promise<number> {
    if (window.electronAPI?.offlineStore) {
      return await window.electronAPI.offlineStore.getPendingCount();
    }
    const list = this.getFallbackItems();
    return list.filter((i) => i.status === 'PENDING' || i.status === 'UPLOADING').length;
  },

  async updateItemStatus(params: {
    id: string;
    status: 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';
    updates?: { errorMessage?: string; retries?: number; sessionId?: string };
  }): Promise<boolean> {
    if (window.electronAPI?.offlineStore) {
      return await window.electronAPI.offlineStore.updateItemStatus(params);
    }

    const list = this.getFallbackItems();
    const item = list.find((i) => i.id === params.id);
    if (!item) return false;

    item.status = params.status;
    item.lastAttemptAt = new Date().toISOString();
    if (params.updates?.errorMessage !== undefined) item.errorMessage = params.updates.errorMessage;
    if (params.updates?.retries !== undefined) item.retries = params.updates.retries;
    if (params.updates?.sessionId) item.sessionId = params.updates.sessionId;

    this.saveFallbackItems(list);
    return true;
  },

  async readScreenshot(item: OfflineItem): Promise<{ base64: string; size: number } | null> {
    if (window.electronAPI?.offlineStore && item.filePath) {
      return await window.electronAPI.offlineStore.readScreenshot(item.filePath);
    }
    if (item.base64) {
      return {
        base64: item.base64,
        size: item.fileSize || item.base64.length,
      };
    }
    return null;
  },

  async removeItem(id: string): Promise<boolean> {
    if (window.electronAPI?.offlineStore) {
      return await window.electronAPI.offlineStore.removeItem(id);
    }

    let list = this.getFallbackItems();
    list = list.filter((i) => i.id !== id);
    this.saveFallbackItems(list);
    return true;
  },

  async getStorageStats(): Promise<{
    pendingCount: number;
    screenshotCount: number;
    totalSizeBytes: number;
    totalSizeMB: string;
    warning: boolean;
  }> {
    if (window.electronAPI?.offlineStore) {
      return await window.electronAPI.offlineStore.getStorageStats();
    }
    const list = this.getFallbackItems();
    const pendingCount = list.filter((i) => i.status === 'PENDING').length;
    const scList = list.filter((i) => i.type === 'SCREENSHOT');
    return {
      pendingCount,
      screenshotCount: scList.length,
      totalSizeBytes: 0,
      totalSizeMB: '0.00',
      warning: false,
    };
  },

  async clearAll(): Promise<boolean> {
    if (window.electronAPI?.offlineStore) {
      return await window.electronAPI.offlineStore.clearAll();
    }
    localStorage.removeItem('timelogger_fallback_offline_queue');
    return true;
  },

  // Fallback helpers for browser dev
  getFallbackItems(): OfflineItem[] {
    try {
      const raw = localStorage.getItem('timelogger_fallback_offline_queue');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveFallbackItems(items: OfflineItem[]) {
    try {
      localStorage.setItem('timelogger_fallback_offline_queue', JSON.stringify(items.slice(-30)));
    } catch {}
  },
};
