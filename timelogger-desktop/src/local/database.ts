export interface LocalSessionRecord {
  localSessionId: string;
  serverSessionId?: string | null;
  employeeId: string;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  notes?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  isOffline: boolean;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface LocalEventRecord {
  eventId: string;
  localSessionId: string;
  serverSessionId?: string | null;
  eventType: 'SESSION_START' | 'SESSION_STOP' | 'BREAK_START' | 'BREAK_END' | 'HEARTBEAT';
  occurredAt: string;
  payload: Record<string, any>;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  retries: number;
  createdAt: string;
}

export interface LocalScreenshotRecord {
  localScreenshotId: string;
  localSessionId: string;
  serverSessionId?: string | null;
  capturedAt: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  activityPercentage: number;
  projectId?: string | null;
  taskId?: string | null;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  createdAt: string;
  base64Data?: string;
}

export interface PendingCount {
  sessions: number;
  events: number;
  screenshots: number;
  total: number;
}

export const localDb = {
  async getPendingCount(): Promise<PendingCount> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.getPendingCount();
    }
    return { sessions: 0, events: 0, screenshots: 0, total: 0 };
  },

  async saveSession(session: LocalSessionRecord): Promise<LocalSessionRecord> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.saveSession(session);
    }
    return session;
  },

  async updateSession(localSessionId: string, updates: Partial<LocalSessionRecord>): Promise<LocalSessionRecord | null> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.updateSession(localSessionId, updates);
    }
    return null;
  },

  async getActiveSession(employeeId?: string): Promise<LocalSessionRecord | null> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.getActiveSession(employeeId);
    }
    return null;
  },

  async getPendingSessions(): Promise<LocalSessionRecord[]> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.getPendingSessions();
    }
    return [];
  },

  async markSessionSynced(localSessionId: string, serverSessionId: string): Promise<boolean> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.markSessionSynced(localSessionId, serverSessionId);
    }
    return true;
  },

  async addEvent(event: LocalEventRecord): Promise<LocalEventRecord> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.addEvent(event);
    }
    return event;
  },

  async getPendingEvents(): Promise<LocalEventRecord[]> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.getPendingEvents();
    }
    return [];
  },

  async markEventSynced(eventId: string): Promise<boolean> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.markEventSynced(eventId);
    }
    return true;
  },

  async incrementEventRetry(eventId: string): Promise<boolean> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.incrementEventRetry(eventId);
    }
    return true;
  },

  async saveScreenshot(
    metadata: Omit<LocalScreenshotRecord, 'filePath' | 'fileSize'>,
    base64Data: string,
  ): Promise<LocalScreenshotRecord> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.saveScreenshot(metadata, base64Data);
    }
    return {
      ...metadata,
      filePath: '',
      fileSize: 0,
    };
  },

  async getPendingScreenshots(): Promise<LocalScreenshotRecord[]> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.getPendingScreenshots();
    }
    return [];
  },

  async markScreenshotSynced(localScreenshotId: string): Promise<boolean> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.markScreenshotSynced(localScreenshotId);
    }
    return true;
  },

  async clearAll(): Promise<boolean> {
    if (window.electronAPI?.offlineDb) {
      return await window.electronAPI.offlineDb.clearAll();
    }
    return true;
  },
};
