import { storage } from '../services/storage';

export interface SavedUserCredentials {
  email: string;
  password?: string;
  serverUrl: string;
  tokens?: {
    accessToken: string;
    refreshToken?: string;
  };
  employee?: any;
  organization?: any;
  device?: any;
  schedule?: any;
  savedAt?: string;
}

export const credentials = {
  async save(data: {
    email: string;
    password?: string;
    serverUrl: string;
    tokens?: any;
    employee?: any;
    organization?: any;
    device?: any;
    schedule?: any;
  }): Promise<boolean> {
    if (window.electronAPI?.saveCredentials) {
      return await window.electronAPI.saveCredentials(data);
    }
    // Fallback: save non-sensitive info to localStorage (never plaintext password)
    if (data.tokens?.accessToken) {
      storage.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    }
    if (data.employee) storage.setEmployee(data.employee);
    if (data.organization) storage.setOrganization(data.organization);
    if (data.device) storage.setDevice(data.device);
    if (data.schedule) storage.setSchedule(data.schedule);
    storage.setServerUrl(data.serverUrl);
    return true;
  },

  async get(): Promise<SavedUserCredentials | null> {
    if (window.electronAPI?.getCredentials) {
      const creds = await window.electronAPI.getCredentials();
      if (creds && creds.email) {
        return creds;
      }
    }
    // Fallback from localStorage
    const tokens = storage.getTokens();
    const employee = storage.getEmployee();
    const organization = storage.getOrganization();
    const device = storage.getDevice();
    const schedule = storage.getSchedule();
    const serverUrl = storage.getServerUrl();

    if (employee?.email || tokens.accessToken) {
      return {
        email: employee?.email || '',
        serverUrl,
        tokens: tokens.accessToken ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || undefined } : undefined,
        employee: employee || undefined,
        organization: organization || undefined,
        device: device || undefined,
        schedule: schedule || undefined,
      };
    }
    return null;
  },

  async has(): Promise<boolean> {
    if (window.electronAPI?.hasCredentials) {
      const hasCreds = await window.electronAPI.hasCredentials();
      if (hasCreds) return true;
    }
    const { accessToken } = storage.getTokens();
    const emp = storage.getEmployee();
    return !!(accessToken && emp);
  },

  async clear(): Promise<boolean> {
    if (window.electronAPI?.clearCredentials) {
      await window.electronAPI.clearCredentials();
    }
    storage.clearAuth();
    return true;
  },
};
