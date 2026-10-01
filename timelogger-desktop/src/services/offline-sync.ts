import { agentApi } from './api';
import { storage } from './storage';
import { localDb } from '../local/database';
import { authService } from './auth';
import { connectivity } from './connectivity';

export interface SyncProgressResult {
  success: boolean;
  isOnline: boolean;
  syncedSessions: number;
  syncedEvents: number;
  syncedScreenshots: number;
  remainingPending: number;
  error?: string;
  isAuthFailure?: boolean;
  reconciledSummary?: {
    todayWorkedSeconds: number;
    todayActiveSeconds: number;
    todayIdleSeconds: number;
    todayBreakSeconds: number;
    lastPunchOutTime?: string;
    activeSession: any | null;
  };
}

export const offlineSync = {
  /**
   * Manual Reconnection & Sync workflow
   * Explicitly triggered by user clicking "You're offline · Click here to go online"
   * NO BACKGROUND WORKER
   */
  async sync(currentActiveSessionId?: string): Promise<SyncProgressResult> {
    console.log('[MANUAL SYNC] Initiating manual sync...');

    // 1. Connectivity Check
    const conn = await connectivity.check();
    if (!conn.isOnline || !conn.isBackendReachable) {
      console.warn('[MANUAL SYNC] Connectivity check failed: backend unreachable');
      return {
        success: false,
        isOnline: false,
        syncedSessions: 0,
        syncedEvents: 0,
        syncedScreenshots: 0,
        remainingPending: (await localDb.getPendingCount()).total,
        error: 'Still offline. Please try again.',
      };
    }

    // 2. Authentication with Saved Credentials
    const authRes = await authService.loginWithSavedCredentials();
    if (!authRes.success || !authRes.isOnline) {
      console.warn('[MANUAL SYNC] Authentication failed:', authRes.error);
      return {
        success: false,
        isOnline: authRes.isOnline,
        syncedSessions: 0,
        syncedEvents: 0,
        syncedScreenshots: 0,
        remainingPending: (await localDb.getPendingCount()).total,
        error: authRes.isInvalidCredentials
          ? 'Your saved login session is no longer valid. Please log in again.'
          : authRes.error || 'Authentication failed',
        isAuthFailure: authRes.isInvalidCredentials,
      };
    }

    let syncedSessions = 0;
    let syncedEvents = 0;
    let syncedScreenshots = 0;

    // Track local session ID -> server session ID mapping
    const sessionIdMap: Record<string, string> = {};

    // If we have a known active server session ID passed in, seed the map
    if (currentActiveSessionId && !currentActiveSessionId.startsWith('offline_')) {
      sessionIdMap[currentActiveSessionId] = currentActiveSessionId;
    }

    // 3. Resolve existing active server session
    let serverActiveSession = await agentApi.getCurrentSession().catch(() => null);
    if (serverActiveSession?.id) {
      console.log('[MANUAL SYNC] Found active server session:', serverActiveSession.id);
      sessionIdMap[serverActiveSession.id] = serverActiveSession.id;
    }

    // 4. Synchronize Sessions (SESSION_START & Completed Offline Sessions)
    const pendingSessions = await localDb.getPendingSessions();
    for (const sess of pendingSessions) {
      try {
        const payload: any = {
          clientSessionId: sess.localSessionId,
          startedAt: sess.startedAt,
          endedAt: sess.endedAt || undefined,
          durationSeconds: sess.durationSeconds || undefined,
          projectId: sess.projectId || undefined,
          taskId: sess.taskId || undefined,
          notes: sess.notes || undefined,
        };

        const res = await agentApi.syncOfflineSession(payload);
        if (res?.id) {
          sessionIdMap[sess.localSessionId] = res.id;
          await localDb.markSessionSynced(sess.localSessionId, res.id);
          syncedSessions++;
          console.log(`[MANUAL SYNC] Synced session: ${sess.localSessionId} -> ${res.id}`);
        }
      } catch (err: any) {
        console.warn(`[MANUAL SYNC] Error syncing session ${sess.localSessionId}:`, err?.message);
        // If session already exists or has duplicate key, mark synced if possible
        if (err?.message?.includes('already exists') || err?.message?.includes('duplicate')) {
          await localDb.markSessionSynced(sess.localSessionId, sess.localSessionId);
        }
      }
    }

    // 5. Synchronize Events (SESSION_START, HEARTBEAT, BREAK_START, BREAK_END, SESSION_STOP)
    const pendingEvents = await localDb.getPendingEvents();
    for (const ev of pendingEvents) {
      try {
        let targetSessionId = sessionIdMap[ev.localSessionId] || ev.serverSessionId || ev.localSessionId;

        // If targetSessionId is an unmapped offline ID, try using serverActiveSession
        if (targetSessionId.startsWith('offline_') && serverActiveSession?.id) {
          targetSessionId = serverActiveSession.id;
        }

        if (ev.eventType === 'SESSION_START') {
          // If not already synced in step 4
          if (ev.syncStatus === 'PENDING') {
            const res = await agentApi.syncOfflineSession(ev.payload as any);
            if (res?.id) {
              sessionIdMap[ev.localSessionId] = res.id;
              await localDb.markSessionSynced(ev.localSessionId, res.id);
            }
            await localDb.markEventSynced(ev.eventId);
            syncedEvents++;
          }
        } else if (ev.eventType === 'HEARTBEAT') {
          // Map sessionId
          const heartbeatPayload: any = {
            ...ev.payload,
            sessionId: targetSessionId,
          };

          if (targetSessionId && !targetSessionId.startsWith('offline_')) {
            await agentApi.sendHeartbeat(heartbeatPayload);
            await localDb.markEventSynced(ev.eventId);
            syncedEvents++;
          }
        } else if (ev.eventType === 'BREAK_START') {
          if (targetSessionId && !targetSessionId.startsWith('offline_')) {
            await agentApi.startBreak({
              sessionId: targetSessionId,
              reason: ev.payload.reason,
            });
            await localDb.markEventSynced(ev.eventId);
            syncedEvents++;
          }
        } else if (ev.eventType === 'BREAK_END') {
          if (targetSessionId && !targetSessionId.startsWith('offline_')) {
            await agentApi.endBreak({ sessionId: targetSessionId });
            await localDb.markEventSynced(ev.eventId);
            syncedEvents++;
          }
        } else if (ev.eventType === 'SESSION_STOP') {
          if (targetSessionId && !targetSessionId.startsWith('offline_')) {
            await agentApi.stopWorkSession({
              sessionId: targetSessionId,
              notes: ev.payload.notes,
            });
            await localDb.markEventSynced(ev.eventId);
            syncedEvents++;
          }
        }
      } catch (err: any) {
        console.warn(`[MANUAL SYNC] Error syncing event ${ev.eventId} (${ev.eventType}):`, err?.message);
        await localDb.incrementEventRetry(ev.eventId);
        // If permanent error or session not found, mark synced to prevent eternal block
        if (
          (ev.retries || 0) >= 5 ||
          err?.message?.includes('not found') ||
          err?.message?.includes('404') ||
          err?.message?.includes('does not belong')
        ) {
          await localDb.markEventSynced(ev.eventId);
        }
      }
    }

    // 6. Synchronize Screenshots
    const pendingScreenshots = await localDb.getPendingScreenshots();
    for (const sc of pendingScreenshots) {
      try {
        let targetSessionId = sessionIdMap[sc.localSessionId] || sc.serverSessionId || sc.localSessionId;

        if (targetSessionId.startsWith('offline_') && serverActiveSession?.id) {
          targetSessionId = serverActiveSession.id;
        }

        // If still a dummy offline ID and cannot be resolved, skip for now
        if (targetSessionId.startsWith('offline_')) {
          continue;
        }

        if (!sc.base64Data) {
          console.warn(`[MANUAL SYNC] No base64 data for screenshot ${sc.localScreenshotId}, skipping`);
          continue;
        }

        await agentApi.uploadScreenshotPipeline({
          sessionId: targetSessionId,
          base64: sc.base64Data,
          width: sc.width,
          height: sc.height,
          fileSize: sc.fileSize,
          mimeType: sc.mimeType,
          capturedAt: sc.capturedAt,
          activityPercentage: sc.activityPercentage,
          projectId: sc.projectId,
          taskId: sc.taskId,
        });

        await localDb.markScreenshotSynced(sc.localScreenshotId);
        syncedScreenshots++;
        console.log(`[MANUAL SYNC] Uploaded offline screenshot: ${sc.localScreenshotId}`);
      } catch (err: any) {
        console.warn(`[MANUAL SYNC] Failed to upload screenshot ${sc.localScreenshotId}:`, err?.message);
        if (
          err?.message?.includes('not found') ||
          err?.message?.includes('404') ||
          err?.message?.includes('does not belong')
        ) {
          await localDb.markScreenshotSynced(sc.localScreenshotId);
        }
      }
    }

    // 7. Flush legacy storage queue / screenshots if any exist
    try {
      await agentApi.syncAllOfflineData();
    } catch {}

    const remainingCounts = await localDb.getPendingCount();

    // 8. CRITICAL: Reconcile Authoritative Session State & Totals (Sections 23 - 30)
    const todayStr = new Date().toISOString().split('T')[0];
    const serverSummary = await agentApi.getTodaySummary(todayStr).catch(() => null);

    let reconciledSummary: SyncProgressResult['reconciledSummary'] = undefined;

    if (serverSummary) {
      const worked = serverSummary.workedSeconds ?? serverSummary.activeSeconds ?? 0;
      const active = serverSummary.activeSeconds ?? serverSummary.workedSeconds ?? 0;
      const idle = serverSummary.idleSeconds || 0;
      const brk = serverSummary.breakSeconds || 0;
      const lastOut = serverSummary.lastPunchOutTime || '';
      const actSess = serverSummary.activeSession || null;

      reconciledSummary = {
        todayWorkedSeconds: worked,
        todayActiveSeconds: active,
        todayIdleSeconds: idle,
        todayBreakSeconds: brk,
        lastPunchOutTime: lastOut,
        activeSession: actSess,
      };

      // Update cached daily state
      const emp = storage.getEmployee();
      storage.setDailyState(
        {
          date: todayStr,
          workedSeconds: worked,
          activeSeconds: active,
          idleSeconds: idle,
          breakSeconds: brk,
          lastPunchOutTime: lastOut,
        },
        emp,
      );
    }

    console.log(`[MANUAL SYNC] COMPLETE: Synced ${syncedSessions} sessions, ${syncedEvents} events, ${syncedScreenshots} screenshots. Remaining: ${remainingCounts.total}`);

    return {
      success: true,
      isOnline: true,
      syncedSessions,
      syncedEvents,
      syncedScreenshots,
      remainingPending: remainingCounts.total,
      reconciledSummary,
    };
  },
};
