import { agentApi } from './api';
import { storage } from './storage';
import { credentials, SavedUserCredentials } from '../local/credentials';

export interface AuthResult {
  success: boolean;
  isOnline: boolean;
  data?: any;
  error?: string;
  isInvalidCredentials?: boolean;
}

export const authService = {
  /**
   * First login online: authenticates and securely stores credentials locally
   */
  async login(payload: { email: string; password: string; serverUrl?: string }): Promise<AuthResult> {
    if (payload.serverUrl) {
      storage.setServerUrl(payload.serverUrl);
    }

    try {
      const data = await agentApi.login({
        email: payload.email,
        password: payload.password,
      });

      // Securely persist login credentials
      await credentials.save({
        email: payload.email,
        password: payload.password,
        serverUrl: storage.getServerUrl(),
        tokens: data.tokens,
        employee: data.employee,
        organization: data.organization,
        device: data.device,
        schedule: data.schedule,
      });

      return {
        success: true,
        isOnline: true,
        data,
      };
    } catch (err: any) {
      const msg = err?.message || 'Login failed';
      const isInvalid =
        msg.toLowerCase().includes('credential') ||
        msg.toLowerCase().includes('password') ||
        msg.toLowerCase().includes('unauthorized') ||
        msg.toLowerCase().includes('401');
      return {
        success: false,
        isOnline: !msg.includes('Network error'),
        error: msg,
        isInvalidCredentials: isInvalid,
      };
    }
  },

  /**
   * Automatic login using saved secure credentials
   */
  async loginWithSavedCredentials(): Promise<AuthResult> {
    const saved = await credentials.get();
    if (!saved || !saved.email) {
      return {
        success: false,
        isOnline: true,
        error: 'No saved credentials found',
      };
    }

    if (saved.serverUrl) {
      storage.setServerUrl(saved.serverUrl);
    }

    const isNetOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // 1. If we have saved password and internet is connected, perform agent login
    if (saved.password && isNetOnline) {
      try {
        const data = await agentApi.login({
          email: saved.email,
          password: saved.password,
        });

        // Update tokens and metadata in secure storage
        await credentials.save({
          email: saved.email,
          password: saved.password,
          serverUrl: storage.getServerUrl(),
          tokens: data.tokens,
          employee: data.employee,
          organization: data.organization,
          device: data.device,
          schedule: data.schedule,
        });

        return {
          success: true,
          isOnline: true,
          data,
        };
      } catch (err: any) {
        const msg = err?.message || 'Auto-login failed';
        const isNetworkErr = msg.includes('Network error') || msg.includes('fetch');
        const isInvalid =
          msg.toLowerCase().includes('credential') ||
          msg.toLowerCase().includes('password') ||
          msg.toLowerCase().includes('unauthorized') ||
          msg.toLowerCase().includes('401');

        if (isNetworkErr) {
          // Network unreachable -> Restore state for offline mode
          this.restoreSavedState(saved);
          return {
            success: true,
            isOnline: false,
            data: saved,
          };
        }

        return {
          success: false,
          isOnline: true,
          error: msg,
          isInvalidCredentials: isInvalid,
        };
      }
    }

    // 2. If password not stored but tokens exist (e.g. existing session / token auth)
    if (saved.tokens?.accessToken) {
      this.restoreSavedState(saved);
      if (isNetOnline) {
        try {
          const summary = await agentApi.getTodaySummary();
          if (summary) {
            return {
              success: true,
              isOnline: true,
              data: saved,
            };
          }
        } catch {
          // Token verification failed or server error
        }
      }
      return {
        success: true,
        isOnline: isNetOnline,
        data: saved,
      };
    }

    // 3. Fallback when offline
    this.restoreSavedState(saved);
    return {
      success: true,
      isOnline: false,
      data: saved,
    };
  },

  /**
   * Restores offline state from saved metadata so the user can work without internet
   */
  restoreSavedState(saved: SavedUserCredentials): void {
    if (saved.serverUrl) storage.setServerUrl(saved.serverUrl);
    if (saved.tokens?.accessToken) {
      storage.setTokens(saved.tokens.accessToken, saved.tokens.refreshToken);
    }
    if (saved.employee) storage.setEmployee(saved.employee);
    if (saved.organization) storage.setOrganization(saved.organization);
    if (saved.device) storage.setDevice(saved.device);
    if (saved.schedule) storage.setSchedule(saved.schedule);
  },

  async hasSavedCredentials(): Promise<boolean> {
    return await credentials.has();
  },

  async logout(): Promise<void> {
    await credentials.clear();
    storage.clearAuth();
    storage.clearAllOfflineData();
  },
};

