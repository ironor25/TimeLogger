import { EmployeeInfo, OrganizationInfo, DeviceInfo, WorkScheduleInfo, OfflineQueueItem } from '../types';

const STORAGE_KEYS = {
  SERVER_URL: 'pulsetime_server_url',
  ACCESS_TOKEN: 'pulsetime_access_token',
  REFRESH_TOKEN: 'pulsetime_refresh_token',
  EMPLOYEE: 'pulsetime_employee',
  ORGANIZATION: 'pulsetime_organization',
  DEVICE: 'pulsetime_device',
  SCHEDULE: 'pulsetime_schedule',
  LAST_PROJECT_ID: 'pulsetime_last_project_id',
  LAST_TASK_ID: 'pulsetime_last_task_id',
  OFFLINE_QUEUE: 'pulsetime_offline_queue',
  ALWAYS_ON_TOP: 'pulsetime_always_on_top',
  DAILY_STATE: 'pulsetime_daily_state',
};

const DEFAULT_SERVER_URL = 'https://timelogger-dy6t.onrender.com/api/v1';

export const storage = {
  getServerUrl(): string {
    const saved = localStorage.getItem(STORAGE_KEYS.SERVER_URL);
    if (!saved || saved.includes('localhost:4000')) {
      return DEFAULT_SERVER_URL;
    }
    return saved;
  },

  setServerUrl(url: string) {
    localStorage.setItem(STORAGE_KEYS.SERVER_URL, url.replace(/\/+$/, ''));
  },

  getTokens(): { accessToken: string | null; refreshToken: string | null } {
    return {
      accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
      refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
    };
  },

  setTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  },

  clearAuth() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEE);
    localStorage.removeItem(STORAGE_KEYS.ORGANIZATION);
    localStorage.removeItem(STORAGE_KEYS.DEVICE);
    localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
  },

  getEmployee(): EmployeeInfo | null {
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEE);
    return raw ? JSON.parse(raw) : null;
  },

  setEmployee(emp: EmployeeInfo) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEE, JSON.stringify(emp));
  },

  getOrganization(): OrganizationInfo | null {
    const raw = localStorage.getItem(STORAGE_KEYS.ORGANIZATION);
    return raw ? JSON.parse(raw) : null;
  },

  setOrganization(org: OrganizationInfo) {
    localStorage.setItem(STORAGE_KEYS.ORGANIZATION, JSON.stringify(org));
  },

  getDevice(): DeviceInfo | null {
    const raw = localStorage.getItem(STORAGE_KEYS.DEVICE);
    return raw ? JSON.parse(raw) : null;
  },

  setDevice(dev: DeviceInfo) {
    localStorage.setItem(STORAGE_KEYS.DEVICE, JSON.stringify(dev));
  },

  getSchedule(): WorkScheduleInfo | null {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    return raw ? JSON.parse(raw) : null;
  },

  setSchedule(sched: WorkScheduleInfo | null) {
    if (sched) {
      localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(sched));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
    }
  },

  getLastProjectAndTask(): { projectId: string | null; taskId: string | null } {
    return {
      projectId: localStorage.getItem(STORAGE_KEYS.LAST_PROJECT_ID),
      taskId: localStorage.getItem(STORAGE_KEYS.LAST_TASK_ID),
    };
  },

  setLastProjectAndTask(projectId?: string | null, taskId?: string | null) {
    if (projectId) localStorage.setItem(STORAGE_KEYS.LAST_PROJECT_ID, projectId);
    if (taskId) localStorage.setItem(STORAGE_KEYS.LAST_TASK_ID, taskId);
  },

  getOfflineQueue(): OfflineQueueItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  },

  addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retries'>) {
    const queue = this.getOfflineQueue();
    const fullItem: OfflineQueueItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      retries: 0,
    };
    queue.push(fullItem);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    return fullItem;
  },

  setOfflineQueue(queue: OfflineQueueItem[]) {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  },

  getDailyState(): {
    date: string;
    workedSeconds: number;
    activeSeconds: number;
    idleSeconds: number;
    breakSeconds: number;
    lastPunchOutTime?: string;
  } | null {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_STATE);
    return raw ? JSON.parse(raw) : null;
  },

  setDailyState(state: {
    date: string;
    workedSeconds: number;
    activeSeconds: number;
    idleSeconds: number;
    breakSeconds: number;
    lastPunchOutTime?: string;
  }) {
    localStorage.setItem(STORAGE_KEYS.DAILY_STATE, JSON.stringify(state));
  },
};
