import { localDb, LocalSessionRecord, LocalEventRecord, LocalScreenshotRecord, PendingCount } from './database';
import { storage } from '../services/storage';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'uuid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

export const offlineStore = {
  generateUUID,

  async startOfflineSession(payload: {
    projectId?: string | null;
    taskId?: string | null;
    notes?: string | null;
  }): Promise<LocalSessionRecord> {
    const employee = storage.getEmployee();
    const localSessionId = `offline_sess_${generateUUID()}`;
    const now = new Date().toISOString();

    const session: LocalSessionRecord = {
      localSessionId,
      serverSessionId: null,
      employeeId: employee?.id || 'offline_employee',
      startedAt: now,
      endedAt: null,
      durationSeconds: 0,
      status: 'ACTIVE',
      notes: payload.notes || null,
      projectId: payload.projectId || null,
      taskId: payload.taskId || null,
      isOffline: true,
      syncStatus: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };

    await localDb.saveSession(session);

    // Queue session start event
    const startEvent: LocalEventRecord = {
      eventId: generateUUID(),
      localSessionId,
      serverSessionId: null,
      eventType: 'SESSION_START',
      occurredAt: now,
      payload: {
        clientSessionId: localSessionId,
        startedAt: now,
        notes: payload.notes || undefined,
        projectId: payload.projectId || undefined,
        taskId: payload.taskId || undefined,
      },
      syncStatus: 'PENDING',
      retries: 0,
      createdAt: now,
    };
    await localDb.addEvent(startEvent);

    return session;
  },

  async stopOfflineSession(localSessionId: string, notes?: string): Promise<LocalSessionRecord | null> {
    const now = new Date().toISOString();
    const active = await localDb.getActiveSession();
    const startedAtMs = active ? new Date(active.startedAt).getTime() : Date.now();
    const durationSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));

    const updated = await localDb.updateSession(localSessionId, {
      endedAt: now,
      durationSeconds,
      status: 'COMPLETED',
      notes: notes || undefined,
    });

    // Queue stop event
    const stopEvent: LocalEventRecord = {
      eventId: generateUUID(),
      localSessionId,
      serverSessionId: updated?.serverSessionId || null,
      eventType: 'SESSION_STOP',
      occurredAt: now,
      payload: {
        clientSessionId: localSessionId,
        sessionId: updated?.serverSessionId || localSessionId,
        startedAt: updated?.startedAt || now,
        endedAt: now,
        durationSeconds,
        notes: notes || undefined,
      },
      syncStatus: 'PENDING',
      retries: 0,
      createdAt: now,
    };
    await localDb.addEvent(stopEvent);

    return updated;
  },

  async recordHeartbeat(payload: {
    sessionId: string;
    capturedAt?: string;
    activeSeconds: number;
    idleSeconds: number;
    activeApplication?: string;
    windowTitle?: string;
    keysPressed?: number;
    mouseClicks?: number;
  }): Promise<LocalEventRecord> {
    const now = payload.capturedAt || new Date().toISOString();
    const event: LocalEventRecord = {
      eventId: generateUUID(),
      localSessionId: payload.sessionId,
      serverSessionId: payload.sessionId.startsWith('offline_') ? null : payload.sessionId,
      eventType: 'HEARTBEAT',
      occurredAt: now,
      payload: {
        sessionId: payload.sessionId,
        capturedAt: now,
        activeSeconds: payload.activeSeconds,
        idleSeconds: payload.idleSeconds,
        activeApplication: payload.activeApplication,
        windowTitle: payload.windowTitle,
        keysPressed: payload.keysPressed || 0,
        mouseClicks: payload.mouseClicks || 0,
      },
      syncStatus: 'PENDING',
      retries: 0,
      createdAt: new Date().toISOString(),
    };

    return await localDb.addEvent(event);
  },

  async recordBreakStart(sessionId: string, reason: string = 'Break'): Promise<LocalEventRecord> {
    const now = new Date().toISOString();
    const event: LocalEventRecord = {
      eventId: generateUUID(),
      localSessionId: sessionId,
      serverSessionId: sessionId.startsWith('offline_') ? null : sessionId,
      eventType: 'BREAK_START',
      occurredAt: now,
      payload: {
        sessionId,
        reason,
      },
      syncStatus: 'PENDING',
      retries: 0,
      createdAt: now,
    };
    await localDb.updateSession(sessionId, { status: 'PAUSED' });
    return await localDb.addEvent(event);
  },

  async recordBreakEnd(sessionId: string): Promise<LocalEventRecord> {
    const now = new Date().toISOString();
    const event: LocalEventRecord = {
      eventId: generateUUID(),
      localSessionId: sessionId,
      serverSessionId: sessionId.startsWith('offline_') ? null : sessionId,
      eventType: 'BREAK_END',
      occurredAt: now,
      payload: {
        sessionId,
      },
      syncStatus: 'PENDING',
      retries: 0,
      createdAt: now,
    };
    await localDb.updateSession(sessionId, { status: 'ACTIVE' });
    return await localDb.addEvent(event);
  },

  async recordScreenshot(payload: {
    sessionId: string;
    capturedAt?: string;
    base64: string;
    width: number;
    height: number;
    activityPercentage: number;
    projectId?: string | null;
    taskId?: string | null;
    mimeType?: string;
  }): Promise<LocalScreenshotRecord> {
    const localScreenshotId = `sc_${generateUUID()}`;
    const capturedAt = payload.capturedAt || new Date().toISOString();

    const metadata = {
      localScreenshotId,
      localSessionId: payload.sessionId,
      serverSessionId: payload.sessionId.startsWith('offline_') ? null : payload.sessionId,
      capturedAt,
      mimeType: payload.mimeType || 'image/jpeg',
      width: payload.width,
      height: payload.height,
      activityPercentage: payload.activityPercentage,
      projectId: payload.projectId || null,
      taskId: payload.taskId || null,
      syncStatus: 'PENDING' as const,
      createdAt: new Date().toISOString(),
    };

    return await localDb.saveScreenshot(metadata, payload.base64);
  },

  async getPendingCount(): Promise<PendingCount> {
    return await localDb.getPendingCount();
  },

  async getActiveSession(employeeId?: string): Promise<LocalSessionRecord | null> {
    return await localDb.getActiveSession(employeeId);
  },

  async getPendingSessions(): Promise<LocalSessionRecord[]> {
    return await localDb.getPendingSessions();
  },

  async getPendingEvents(): Promise<LocalEventRecord[]> {
    return await localDb.getPendingEvents();
  },

  async getPendingScreenshots(): Promise<LocalScreenshotRecord[]> {
    return await localDb.getPendingScreenshots();
  },

  async markSessionSynced(localSessionId: string, serverSessionId: string): Promise<boolean> {
    return await localDb.markSessionSynced(localSessionId, serverSessionId);
  },

  async markEventSynced(eventId: string): Promise<boolean> {
    return await localDb.markEventSynced(eventId);
  },

  async incrementEventRetry(eventId: string): Promise<boolean> {
    return await localDb.incrementEventRetry(eventId);
  },

  async markScreenshotSynced(localScreenshotId: string): Promise<boolean> {
    return await localDb.markScreenshotSynced(localScreenshotId);
  },
};
