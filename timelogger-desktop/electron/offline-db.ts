import { app } from 'electron';
import fs from 'fs';
import path from 'path';

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
}

interface OfflineDbData {
  version: number;
  sessions: LocalSessionRecord[];
  events: LocalEventRecord[];
  screenshots: LocalScreenshotRecord[];
}

function getDbFilePath(): string {
  return path.join(app.getPath('userData'), 'timelogger_offline_db.json');
}

function getScreenshotsDir(): string {
  const dir = path.join(app.getPath('userData'), 'offline_screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export class OfflineDbManager {
  private data: OfflineDbData | null = null;

  private load(): OfflineDbData {
    if (this.data) return this.data;
    const dbPath = getDbFilePath();
    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('[OfflineDB] Error reading offline db file, initializing fresh:', err);
      }
    }
    if (!this.data) {
      this.data = {
        version: 1,
        sessions: [],
        events: [],
        screenshots: [],
      };
    }
    return this.data;
  }

  private save(): void {
    if (!this.data) return;
    try {
      const dbPath = getDbFilePath();
      const parentDir = path.dirname(dbPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      const tmpPath = `${dbPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpPath, dbPath);
    } catch (err) {
      console.error('[OfflineDB] Failed to persist offline db:', err);
    }
  }

  // --- Session Methods ---

  saveSession(session: LocalSessionRecord): LocalSessionRecord {
    const db = this.load();
    const idx = db.sessions.findIndex((s) => s.localSessionId === session.localSessionId);
    if (idx >= 0) {
      db.sessions[idx] = { ...session, updatedAt: new Date().toISOString() };
    } else {
      db.sessions.push(session);
    }
    this.save();
    return session;
  }

  updateSession(localSessionId: string, updates: Partial<LocalSessionRecord>): LocalSessionRecord | null {
    const db = this.load();
    const idx = db.sessions.findIndex((s) => s.localSessionId === localSessionId);
    if (idx >= 0) {
      db.sessions[idx] = {
        ...db.sessions[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.save();
      return db.sessions[idx];
    }
    return null;
  }

  getActiveSession(employeeId?: string): LocalSessionRecord | null {
    const db = this.load();
    const found = db.sessions.find(
      (s) =>
        (!employeeId || s.employeeId === employeeId) &&
        (s.status === 'ACTIVE' || s.status === 'PAUSED'),
    );
    return found || null;
  }

  getPendingSessions(): LocalSessionRecord[] {
    const db = this.load();
    return db.sessions.filter((s) => s.syncStatus === 'PENDING');
  }

  markSessionSynced(localSessionId: string, serverSessionId: string): void {
    const db = this.load();
    const session = db.sessions.find((s) => s.localSessionId === localSessionId);
    if (session) {
      session.syncStatus = 'SYNCED';
      session.serverSessionId = serverSessionId;
      session.updatedAt = new Date().toISOString();
    }
    // Also update serverSessionId on associated events and screenshots if not already set
    for (const ev of db.events) {
      if (ev.localSessionId === localSessionId && !ev.serverSessionId) {
        ev.serverSessionId = serverSessionId;
      }
    }
    for (const sc of db.screenshots) {
      if (sc.localSessionId === localSessionId && !sc.serverSessionId) {
        sc.serverSessionId = serverSessionId;
      }
    }
    this.save();
  }

  // --- Event Methods ---

  addEvent(event: LocalEventRecord): LocalEventRecord {
    const db = this.load();
    db.events.push(event);
    this.save();
    return event;
  }

  getPendingEvents(): LocalEventRecord[] {
    const db = this.load();
    return db.events
      .filter((e) => e.syncStatus === 'PENDING')
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  }

  markEventSynced(eventId: string): void {
    const db = this.load();
    const ev = db.events.find((e) => e.eventId === eventId);
    if (ev) {
      ev.syncStatus = 'SYNCED';
      this.save();
    }
  }

  incrementEventRetry(eventId: string): void {
    const db = this.load();
    const ev = db.events.find((e) => e.eventId === eventId);
    if (ev) {
      ev.retries = (ev.retries || 0) + 1;
      this.save();
    }
  }

  // --- Screenshot Methods ---

  saveScreenshot(
    metadata: Omit<LocalScreenshotRecord, 'filePath' | 'fileSize'>,
    base64Data: string,
  ): LocalScreenshotRecord {
    const dir = getScreenshotsDir();
    const fileName = `${metadata.localScreenshotId}.jpg`;
    const filePath = path.join(dir, fileName);

    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    const record: LocalScreenshotRecord = {
      ...metadata,
      filePath,
      fileSize: buffer.length,
    };

    const db = this.load();
    db.screenshots.push(record);
    this.save();
    return record;
  }

  getPendingScreenshots(): Array<LocalScreenshotRecord & { base64Data: string }> {
    const db = this.load();
    const pending = db.screenshots.filter((s) => s.syncStatus === 'PENDING');
    const result: Array<LocalScreenshotRecord & { base64Data: string }> = [];

    for (const item of pending) {
      try {
        if (fs.existsSync(item.filePath)) {
          const buf = fs.readFileSync(item.filePath);
          result.push({
            ...item,
            base64Data: buf.toString('base64'),
          });
        }
      } catch (err) {
        console.warn(`[OfflineDB] Could not read screenshot file ${item.filePath}:`, err);
      }
    }
    return result;
  }

  markScreenshotSynced(localScreenshotId: string): void {
    const db = this.load();
    const sc = db.screenshots.find((s) => s.localScreenshotId === localScreenshotId);
    if (sc) {
      sc.syncStatus = 'SYNCED';
      // Clean up local screenshot image file from disk
      try {
        if (fs.existsSync(sc.filePath)) {
          fs.unlinkSync(sc.filePath);
        }
      } catch (e) {
        console.warn(`[OfflineDB] Failed to remove local screenshot file ${sc.filePath}:`, e);
      }
      this.save();
    }
  }

  // --- Aggregate & Cleanup ---

  getPendingCount(): { sessions: number; events: number; screenshots: number; total: number } {
    const db = this.load();
    const sessions = db.sessions.filter((s) => s.syncStatus === 'PENDING').length;
    const events = db.events.filter((e) => e.syncStatus === 'PENDING').length;
    const screenshots = db.screenshots.filter((s) => s.syncStatus === 'PENDING').length;
    return {
      sessions,
      events,
      screenshots,
      total: sessions + events + screenshots,
    };
  }

  clearAll(): void {
    const db = this.load();
    // Remove all screenshot files
    for (const sc of db.screenshots) {
      try {
        if (fs.existsSync(sc.filePath)) {
          fs.unlinkSync(sc.filePath);
        }
      } catch {}
    }
    db.sessions = [];
    db.events = [];
    db.screenshots = [];
    this.save();
  }
}

export const offlineDb = new OfflineDbManager();
