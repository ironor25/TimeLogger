import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export type OfflineItemType =
  | 'SESSION_START'
  | 'SESSION_STOP'
  | 'SESSION_BREAK_START'
  | 'SESSION_BREAK_END'
  | 'HEARTBEAT'
  | 'SCREENSHOT';

export type OfflineItemStatus = 'PENDING' | 'UPLOADING' | 'COMPLETED' | 'FAILED';

export interface DurableOfflineItem {
  id: string;
  clientEventId: string;
  type: OfflineItemType;
  status: OfflineItemStatus;
  priority: number; // 1: Sessions/Breaks, 2: Heartbeats, 3: Screenshots
  endpoint?: string;
  payload?: any;
  // Screenshot specific fields
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
  // Retry & tracking
  retries: number;
  createdAt: string;
  occurredAt: string;
  lastAttemptAt?: string;
  errorMessage?: string;
}

export interface StorageStats {
  pendingCount: number;
  screenshotCount: number;
  totalSizeBytes: number;
  totalSizeMB: string;
  warning: boolean;
}

class OfflineStoreManager {
  private queueFilePath: string = '';
  private screenshotsDir: string = '';
  private items: DurableOfflineItem[] = [];
  private isInitialized: boolean = false;

  private getStorePaths() {
    const userDataDir = app?.getPath ? app.getPath('userData') : process.cwd();
    return {
      queueFilePath: path.join(userDataDir, 'timelogger_offline_queue.json'),
      screenshotsDir: path.join(userDataDir, 'timelogger_offline_screenshots'),
    };
  }

  public init() {
    if (this.isInitialized) return;

    const paths = this.getStorePaths();
    this.queueFilePath = paths.queueFilePath;
    this.screenshotsDir = paths.screenshotsDir;

    // Ensure screenshot storage directory exists
    try {
      if (!fs.existsSync(this.screenshotsDir)) {
        fs.mkdirSync(this.screenshotsDir, { recursive: true });
      }
    } catch (err) {
      console.error('[OFFLINE STORE] Failed to create screenshot storage dir:', err);
    }

    // Load persisted queue
    this.loadFromDisk();

    // Reset any items that were left in 'UPLOADING' state due to previous crash or abrupt exit
    let resetCount = 0;
    for (const item of this.items) {
      if (item.status === 'UPLOADING') {
        item.status = 'PENDING';
        resetCount++;
      }
    }

    if (resetCount > 0) {
      console.log(`[OFFLINE STORE] Recovered ${resetCount} items from in-flight crash state -> PENDING`);
      this.saveToDisk();
    }

    this.isInitialized = true;
    console.log(`[OFFLINE STORE] Initialized. Total items in queue: ${this.items.length}, Pending: ${this.getPendingCount()}`);
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.queueFilePath)) {
        const raw = fs.readFileSync(this.queueFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.items = parsed;
        } else {
          this.items = [];
        }
      } else {
        this.items = [];
      }
    } catch (err) {
      console.error('[OFFLINE STORE] Error reading offline store JSON from disk:', err);
      // Backup corrupted file if exists
      try {
        if (fs.existsSync(this.queueFilePath)) {
          fs.copyFileSync(this.queueFilePath, `${this.queueFilePath}.corrupt_${Date.now()}`);
        }
      } catch {}
      this.items = [];
    }
  }

  private saveToDisk() {
    try {
      const tempPath = `${this.queueFilePath}.tmp`;
      const data = JSON.stringify(this.items, null, 2);
      fs.writeFileSync(tempPath, data, 'utf-8');
      fs.renameSync(tempPath, this.queueFilePath);
    } catch (err) {
      console.error('[OFFLINE STORE] Error atomically persisting store to disk:', err);
    }
  }

  public enqueueEvent(params: {
    type: OfflineItemType;
    endpoint: string;
    payload: any;
    occurredAt?: string;
  }): DurableOfflineItem {
    this.init();
    const id = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const clientEventId = params.payload?.clientEventId || `cid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Set priority: 1 for Session Start/Stop/Break, 2 for Heartbeat
    let priority = 2;
    if (
      params.type === 'SESSION_START' ||
      params.type === 'SESSION_STOP' ||
      params.type === 'SESSION_BREAK_START' ||
      params.type === 'SESSION_BREAK_END'
    ) {
      priority = 1;
    }

    const item: DurableOfflineItem = {
      id,
      clientEventId,
      type: params.type,
      status: 'PENDING',
      priority,
      endpoint: params.endpoint,
      payload: {
        ...params.payload,
        clientEventId,
      },
      retries: 0,
      createdAt: new Date().toISOString(),
      occurredAt: params.occurredAt || params.payload?.startedAt || params.payload?.capturedAt || new Date().toISOString(),
    };

    this.items.push(item);
    this.saveToDisk();
    console.log(`[OFFLINE STORE] Queued event [${item.type}] id=${item.id} priority=${item.priority}`);
    return item;
  }

  public enqueueScreenshot(params: {
    sessionId: string;
    capturedAt: string;
    fileSize: number;
    mimeType: string;
    width: number;
    height: number;
    activityPercentage: number;
    projectId?: string | null;
    taskId?: string | null;
    buffer?: number[] | Buffer;
    base64?: string;
  }): DurableOfflineItem {
    this.init();
    const id = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const clientEventId = `sc_cid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fileName = `${id}.jpg`;
    const targetFilePath = path.join(this.screenshotsDir, fileName);

    try {
      if (params.base64) {
        const cleanBase64 = params.base64.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(cleanBase64, 'base64');
        fs.writeFileSync(targetFilePath, buf);
      } else if (params.buffer) {
        const buf = Buffer.isBuffer(params.buffer) ? params.buffer : Buffer.from(params.buffer);
        fs.writeFileSync(targetFilePath, buf);
      } else {
        throw new Error('No image binary data provided');
      }
    } catch (err) {
      console.error('[OFFLINE STORE] Failed to write offline screenshot file to disk:', err);
      throw err;
    }

    const actualSize = fs.existsSync(targetFilePath) ? fs.statSync(targetFilePath).size : params.fileSize;

    const item: DurableOfflineItem = {
      id,
      clientEventId,
      type: 'SCREENSHOT',
      status: 'PENDING',
      priority: 3, // Screenshots uploaded after sessions & heartbeats
      sessionId: params.sessionId,
      filePath: targetFilePath,
      fileSize: actualSize,
      mimeType: params.mimeType || 'image/jpeg',
      width: params.width,
      height: params.height,
      activityPercentage: params.activityPercentage,
      capturedAt: params.capturedAt,
      projectId: params.projectId || null,
      taskId: params.taskId || null,
      retries: 0,
      createdAt: new Date().toISOString(),
      occurredAt: params.capturedAt,
    };

    this.items.push(item);
    this.saveToDisk();
    console.log(`[OFFLINE STORE] Queued screenshot id=${item.id} path=${targetFilePath} size=${actualSize} bytes`);
    return item;
  }

  public getPendingItems(limit: number = 20): DurableOfflineItem[] {
    this.init();
    return this.items
      .filter((item) => item.status === 'PENDING')
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
      .slice(0, limit);
  }

  public getAllItems(): DurableOfflineItem[] {
    this.init();
    return [...this.items];
  }

  public getPendingCount(): number {
    this.init();
    return this.items.filter((item) => item.status === 'PENDING' || item.status === 'UPLOADING').length;
  }

  public updateItemStatus(
    id: string,
    status: OfflineItemStatus,
    updates?: {
      errorMessage?: string;
      retries?: number;
      sessionId?: string;
    },
  ) {
    this.init();
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    item.status = status;
    item.lastAttemptAt = new Date().toISOString();
    if (updates?.errorMessage !== undefined) {
      item.errorMessage = updates.errorMessage;
    }
    if (updates?.retries !== undefined) {
      item.retries = updates.retries;
    }
    if (updates?.sessionId) {
      item.sessionId = updates.sessionId;
    }

    this.saveToDisk();
  }

  public removeCompletedItem(id: string): boolean {
    this.init();
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) return false;

    const item = this.items[index];

    // Delete local screenshot file if exists
    if (item.filePath) {
      try {
        if (fs.existsSync(item.filePath)) {
          fs.unlinkSync(item.filePath);
          console.log(`[OFFLINE STORE] Deleted completed local screenshot file: ${item.filePath}`);
        }
      } catch (err) {
        console.warn('[OFFLINE STORE] Could not delete local screenshot file:', err);
      }
    }

    this.items.splice(index, 1);
    this.saveToDisk();
    return true;
  }

  public readScreenshotData(filePath: string): { base64: string; size: number } | null {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn('[OFFLINE STORE] Screenshot file not found on disk:', filePath);
        return null;
      }
      const buffer = fs.readFileSync(filePath);
      return {
        base64: buffer.toString('base64'),
        size: buffer.length,
      };
    } catch (err) {
      console.error('[OFFLINE STORE] Error reading screenshot file from disk:', err);
      return null;
    }
  }

  public getStorageStats(): StorageStats {
    this.init();
    let screenshotCount = 0;
    let totalSizeBytes = 0;

    try {
      if (fs.existsSync(this.screenshotsDir)) {
        const files = fs.readdirSync(this.screenshotsDir);
        screenshotCount = files.length;
        for (const file of files) {
          try {
            const stats = fs.statSync(path.join(this.screenshotsDir, file));
            totalSizeBytes += stats.size;
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[OFFLINE STORE] Error calculating screenshot folder size:', err);
    }

    const pendingCount = this.getPendingCount();
    const totalSizeMB = (totalSizeBytes / (1024 * 1024)).toFixed(2);
    // Warning threshold: > 150MB or > 500 items
    const warning = totalSizeBytes > 150 * 1024 * 1024 || pendingCount > 500;

    return {
      pendingCount,
      screenshotCount,
      totalSizeBytes,
      totalSizeMB,
      warning,
    };
  }

  public clearAll(): void {
    this.init();
    try {
      if (fs.existsSync(this.screenshotsDir)) {
        const files = fs.readdirSync(this.screenshotsDir);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(this.screenshotsDir, file));
          } catch {}
        }
      }
    } catch {}

    this.items = [];
    this.saveToDisk();
    console.log('[OFFLINE STORE] All offline queue and screenshot files cleared');
  }
}

export const offlineStore = new OfflineStoreManager();
