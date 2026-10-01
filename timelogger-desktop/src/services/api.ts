import { storage } from './storage';
import { Project, Task, ActiveSession } from '../types';

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryAuth = true
): Promise<T> {
  const baseUrl = storage.getServerUrl();
  const { accessToken } = storage.getTokens();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && retryAuth) {
      const refreshed = await refreshToken();
      if (refreshed) {
        return request<T>(endpoint, options, false);
      } else {
        storage.clearAuth();
        window.dispatchEvent(new CustomEvent('auth:expired'));
        throw new Error('Session expired. Please log in again.');
      }
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok || json.success === false) {
      const errMsg = json.error?.message || json.message || response.statusText || 'API Request Failed';
      throw new Error(errMsg);
    }

    return json.data !== undefined ? json.data : json;
  } catch (err: any) {
    if (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('network')) {
      throw new Error('Network error: Unable to connect to PulseTime API server.');
    }
    throw err;
  }
}

async function refreshToken(): Promise<boolean> {
  const { refreshToken } = storage.getTokens();
  if (!refreshToken) return false;

  try {
    const baseUrl = storage.getServerUrl();
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;
    const data = await res.json();
    if (data.success && data.data?.tokens) {
      storage.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const agentApi = {
  async login(payload: { email: string; password: string }) {
    let deviceInfo = {
      deviceIdentifier: 'DESKTOP-DEFAULT',
      deviceName: 'Desktop Workstation',
      platform: 'WINDOWS',
      platformVersion: 'Windows 11',
      appVersion: '1.0.0',
    };

    if (window.electronAPI) {
      const info = await window.electronAPI.getDeviceInfo();
      deviceInfo = {
        deviceIdentifier: info.deviceIdentifier,
        deviceName: info.deviceName,
        platform: info.platform,
        platformVersion: info.platformVersion,
        appVersion: info.appVersion,
      };
    }

    const data = await request<any>('/agent/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        ...deviceInfo,
      }),
    });

    const prevEmployee = storage.getEmployee();
    if (prevEmployee && prevEmployee.id !== data.employee.id) {
      storage.clearAuth();
    }

    storage.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    storage.setEmployee(data.employee);
    storage.setOrganization(data.organization);
    storage.setDevice(data.device);
    storage.setSchedule(data.schedule || null);

    return data;
  },

  async getCurrentSession(): Promise<ActiveSession | null> {
    try {
      return await request<ActiveSession | null>('/agent/work-sessions/current');
    } catch {
      return null;
    }
  },

  async startWorkSession(payload: {
    projectId?: string | null;
    taskId?: string | null;
    notes?: string;
  }): Promise<ActiveSession> {
    const device = storage.getDevice();
    return await request<ActiveSession>('/agent/work-sessions/start', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: device?.id,
        projectId: payload.projectId || undefined,
        taskId: payload.taskId || undefined,
        notes: payload.notes || undefined,
      }),
    });
  },

  async stopWorkSession(payload: { sessionId: string; notes?: string }) {
    return await request<any>('/agent/work-sessions/stop', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async startBreak(payload: { sessionId: string; reason?: string }) {
    return await request<any>('/agent/work-sessions/break/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async endBreak(payload: { sessionId: string }) {
    return await request<any>('/agent/work-sessions/break/end', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async sendHeartbeat(payload: {
    sessionId: string;
    capturedAt: string;
    activeSeconds: number;
    idleSeconds: number;
    activeApplication?: string;
    windowTitle?: string;
    keysPressed?: number;
    mouseClicks?: number;
  }) {
    const device = storage.getDevice();
    const fullPayload = {
      ...payload,
      deviceId: device?.id,
    };

    try {
      return await request<any>('/agent/activity/heartbeat', {
        method: 'POST',
        body: JSON.stringify(fullPayload),
      });
    } catch (err: any) {
      // Store in offline queue if server is unreachable
      storage.addToOfflineQueue({
        type: 'HEARTBEAT',
        endpoint: '/agent/activity/heartbeat',
        payload: fullPayload,
      });
      console.warn('Network offline: Queued heartbeat telemetry locally');
      return { queuedOffline: true };
    }
  },

  async uploadScreenshotPipeline(payload: {
    sessionId: string;
    base64?: string;
    dataUrl?: string;
    buffer?: number[];
    width: number;
    height: number;
    fileSize: number;
    mimeType: string;
    capturedAt: string;
    activityPercentage: number;
    projectId?: string | null;
    taskId?: string | null;
  }) {
    console.log('[UPLOAD] ================================');
    console.log('[UPLOAD] Starting screenshot upload');
    console.log('[UPLOAD] sessionId:', payload.sessionId);
    console.log('[UPLOAD] fileSize:', payload.fileSize);
    console.log('[UPLOAD] mimeType:', payload.mimeType);

    // STEP 1
    console.log('[UPLOAD] STEP 1: Requesting upload URL');
    const uploadInfo = await request<{
      uploadUrl: string;
      storageKey: string;
      method?: string;
    }>('/agent/screenshots/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: payload.sessionId,
        mimeType: payload.mimeType,
        fileSize: payload.fileSize,
      }),
    });

    console.log('[UPLOAD] STEP 1 SUCCESS');
    console.log('[UPLOAD] storageKey:', uploadInfo.storageKey);
    console.log('[UPLOAD] method:', uploadInfo.method);
    console.log('[UPLOAD] uploadUrl exists:', !!uploadInfo.uploadUrl);

    // STEP 2
    console.log('[UPLOAD] STEP 2: Preparing binary');
    let uint8Array: Uint8Array;
    if (payload.base64) {
      console.log('[UPLOAD] Using base64 payload');
      const binaryString = atob(payload.base64);
      uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
    } else if (payload.buffer) {
      console.log('[UPLOAD] Using buffer payload');
      uint8Array = new Uint8Array(payload.buffer);
    } else if (payload.dataUrl) {
      console.log('[UPLOAD] Using dataUrl payload');
      const res = await fetch(payload.dataUrl);
      const buf = await res.arrayBuffer();
      uint8Array = new Uint8Array(buf);
    } else {
      throw new Error('No screenshot binary data available');
    }
    console.log('[UPLOAD] Binary bytes prepared:', uint8Array.length);

    // STEP 3
    console.log('[UPLOAD] STEP 3: Uploading binary to storage URL');
    const method = uploadInfo.method || 'POST';
    const uploadBlob = new Blob([uint8Array.buffer as ArrayBuffer], { type: payload.mimeType });

    const serverUrl = storage.getServerUrl();
    let targetUploadUrl = uploadInfo.uploadUrl;
    try {
      if (targetUploadUrl.startsWith('/')) {
        const serverOrigin = new URL(serverUrl).origin;
        targetUploadUrl = `${serverOrigin}${targetUploadUrl}`;
      } else if (targetUploadUrl.includes('localhost') && !serverUrl.includes('localhost')) {
        const serverOrigin = new URL(serverUrl).origin;
        const parsed = new URL(targetUploadUrl);
        targetUploadUrl = `${serverOrigin}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // fallback to original
    }
    console.log('[UPLOAD] targetUploadUrl:', targetUploadUrl);

    let uploadRes: Response;
    if (method.toUpperCase() === 'PUT') {
      uploadRes = await fetch(targetUploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': payload.mimeType,
        },
        body: uploadBlob,
      });
    } else {
      // Use standard FormData with 'file' field for NestJS FileInterceptor
      const formData = new FormData();
      formData.append('file', uploadBlob, 'screenshot.jpg');
      uploadRes = await fetch(targetUploadUrl, {
        method: 'POST',
        body: formData,
      });
    }

    console.log('[UPLOAD] Storage response HTTP status:', uploadRes.status);
    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => '');
      console.error('[UPLOAD] STORAGE ERROR:', errText);
      throw new Error(`Screenshot storage upload failed: HTTP ${uploadRes.status} ${errText}`);
    }
    console.log('[UPLOAD] STEP 3 SUCCESS');

    // STEP 4
    console.log('[UPLOAD] STEP 4: Completing screenshot metadata');
    const result = await request<any>('/agent/screenshots/complete', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: payload.sessionId,
        storageKey: uploadInfo.storageKey,
        capturedAt: payload.capturedAt,
        fileSize: payload.fileSize,
        mimeType: payload.mimeType,
        width: payload.width,
        height: payload.height,
        activityPercentage: payload.activityPercentage,
        projectId: payload.projectId || undefined,
        taskId: payload.taskId || undefined,
      }),
    });

    console.log('[UPLOAD] STEP 4 SUCCESS', result);
    console.log('[UPLOAD] Screenshot pipeline COMPLETE');
    return result;
  },

  async getProjects(): Promise<Project[]> {
    return await request<Project[]>('/agent/projects');
  },

  async getTasks(projectId?: string): Promise<Task[]> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return await request<Task[]>(`/agent/tasks${query}`);
  },

  async getTodaySummary(date?: string): Promise<any> {
    try {
      const query = date ? `?date=${date}` : '';
      return await request(`/agent/work-sessions/today-summary${query}`);
    } catch {
      return null;
    }
  },

  async syncOfflineSession(payload: {
    clientSessionId?: string;
    startedAt: string;
    endedAt?: string;
    durationSeconds?: number;
    projectId?: string;
    taskId?: string;
    notes?: string;
  }): Promise<any> {
    const device = storage.getDevice();
    return await request('/agent/work-sessions/sync-offline', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        deviceId: device?.id,
      }),
    });
  },

  async syncAllOfflineData(
    currentActiveSessionId?: string,
    onSessionIdMapped?: (oldId: string, newId: string) => void,
  ): Promise<{
    syncedSessions: number;
    syncedScreenshots: number;
    syncedTelemetry: number;
  }> {
    let syncedSessions = 0;
    let syncedScreenshots = 0;
    let syncedTelemetry = 0;

    // 1. Flush offline session events and heartbeats
    const queue = storage.getOfflineQueue();
    const remainingQueue: typeof queue = [];

    // Track local sessionId -> server sessionId mappings
    const sessionIdMap: Record<string, string> = {};

    for (const item of queue) {
      try {
        if (item.type === 'SESSION_START' || item.type === 'OFFLINE_SESSION') {
          const res = await request('/agent/work-sessions/sync-offline', {
            method: 'POST',
            body: JSON.stringify(item.payload),
          });
          if (item.payload?.clientSessionId && res?.id) {
            sessionIdMap[item.payload.clientSessionId] = res.id;
            if (onSessionIdMapped) {
              onSessionIdMapped(item.payload.clientSessionId, res.id);
            }
          }
          syncedSessions++;
        } else {
          // Re-map sessionId if needed
          let payload = { ...item.payload };
          if (payload.sessionId && sessionIdMap[payload.sessionId]) {
            payload.sessionId = sessionIdMap[payload.sessionId];
          } else if (
            payload.sessionId &&
            payload.sessionId.startsWith('offline_') &&
            currentActiveSessionId &&
            !currentActiveSessionId.startsWith('offline_')
          ) {
            payload.sessionId = currentActiveSessionId;
          }

          await request(item.endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          syncedTelemetry++;
        }
      } catch (err: any) {
        // If error is 404 (session deleted or permanently gone) or retry count >= 5, drop stale item
        if (
          (item.retries || 0) >= 5 ||
          err?.message?.includes('not found') ||
          err?.message?.includes('404') ||
          err?.message?.includes('does not belong')
        ) {
          console.warn(`[SYNC] Dropping stale offline queue item (${item.type}) due to error:`, err?.message);
        } else {
          item.retries = (item.retries || 0) + 1;
          remainingQueue.push(item);
        }
      }
    }
    storage.setOfflineQueue(remainingQueue);

    // 2. Upload offline screenshots
    const offlineScreenshots = storage.getOfflineScreenshots();
    const remainingScreenshots: typeof offlineScreenshots = [];

    for (const sc of offlineScreenshots) {
      try {
        let targetSessionId = sessionIdMap[sc.sessionId] || sc.sessionId;

        // If targetSessionId is an unmapped offline ID, try using the current active server session
        if (
          targetSessionId.startsWith('offline_') &&
          currentActiveSessionId &&
          !currentActiveSessionId.startsWith('offline_')
        ) {
          targetSessionId = currentActiveSessionId;
        }

        // If still a dummy offline ID and no server session mapping exists, skip for now
        if (targetSessionId.startsWith('offline_')) {
          remainingScreenshots.push(sc);
          continue;
        }

        await this.uploadScreenshotPipeline({
          sessionId: targetSessionId,
          base64: sc.base64,
          dataUrl: sc.dataUrl,
          width: sc.width,
          height: sc.height,
          fileSize: sc.fileSize,
          mimeType: sc.mimeType,
          capturedAt: sc.capturedAt,
          activityPercentage: sc.activityPercentage,
          projectId: sc.projectId,
          taskId: sc.taskId,
        });
        syncedScreenshots++;
      } catch (err: any) {
        console.error('Failed to upload queued offline screenshot:', err?.message || err);
        // If session was not found on backend, drop this screenshot so queue doesn't stay blocked
        if (
          err?.message?.includes('not found') ||
          err?.message?.includes('404') ||
          err?.message?.includes('does not belong')
        ) {
          console.warn('[SYNC] Discarding orphaned screenshot for non-existent session');
        } else {
          remainingScreenshots.push(sc);
        }
      }
    }
    storage.setOfflineScreenshots(remainingScreenshots);

    return {
      syncedSessions,
      syncedScreenshots,
      syncedTelemetry,
    };
  },

  async flushOfflineQueue(): Promise<number> {
    const res = await this.syncAllOfflineData();
    return res.syncedSessions + res.syncedScreenshots + res.syncedTelemetry;
  },
};
