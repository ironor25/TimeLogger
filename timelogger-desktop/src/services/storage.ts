import { EmployeeInfo, OrganizationInfo, DeviceInfo, WorkScheduleInfo, OfflineQueueItem, EmployeeDailyState } from '../types';

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
    localStorage.removeItem(STORAGE_KEYS.LAST_PROJECT_ID);
    localStorage.removeItem(STORAGE_KEYS.LAST_TASK_ID);
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

  getOfflineScreenshots(): Array<{
    id: string;
    sessionId: string;
    capturedAt: string;
    fileSize: number;
    mimeType: string;
    width: number;
    height: number;
    activityPercentage: number;
    projectId?: string;
    taskId?: string;
    base64: string;
    dataUrl?: string;
  }> {
    const raw = localStorage.getItem('pulsetime_offline_screenshots');
    return raw ? JSON.parse(raw) : [];
  },

  addOfflineScreenshot(sc: {
    sessionId: string;
    capturedAt: string;
    fileSize: number;
    mimeType: string;
    width: number;
    height: number;
    activityPercentage: number;
    projectId?: string;
    taskId?: string;
    base64: string;
    dataUrl?: string;
  }) {
    const list = this.getOfflineScreenshots();
    const item = {
      ...sc,
      id: `offline_sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
    list.push(item);
    localStorage.setItem('pulsetime_offline_screenshots', JSON.stringify(list));
    return item;
  },

  setOfflineScreenshots(list: any[]) {
    localStorage.setItem('pulsetime_offline_screenshots', JSON.stringify(list));
  },

  /**
   * Retrieves the full array of employee daily states from localStorage
   */
  getDailyStateArray(): EmployeeDailyState[] {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_STATE);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed && typeof parsed === 'object' && parsed.date) {
        // Handle legacy single-object format by wrapping it
        return [
          {
            employeeEmail: 'legacy@demo.local',
            employeeId: 'legacy',
            employeeName: 'Legacy User',
            ...parsed,
          },
        ];
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Finds the daily state for a specific employee by email or employee ID
   */
  getDailyState(emailOrId?: string, targetDate?: string): EmployeeDailyState | null {
    const emp = this.getEmployee();
    const identifier = (emailOrId || emp?.email || emp?.id || '').toLowerCase().trim();
    if (!identifier) return null;

    const list = this.getDailyStateArray();
    const today = targetDate || new Date().toISOString().split('T')[0];

    const match = list.find(
      (item) =>
        (item.employeeEmail?.toLowerCase() === identifier ||
          item.employeeId?.toLowerCase() === identifier ||
          (emp?.id && item.employeeId === emp.id) ||
          (emp?.email && item.employeeEmail?.toLowerCase() === emp.email.toLowerCase())) &&
        item.date === today,
    );

    return match || null;
  },

  /**
   * Updates or appends the daily state for a specific employee in the array
   */
  setDailyState(
    state: {
      date: string;
      workedSeconds: number;
      activeSeconds: number;
      idleSeconds: number;
      breakSeconds: number;
      lastPunchOutTime?: string;
    },
    employee?: { id?: string; email?: string; displayName?: string; firstName?: string; lastName?: string } | null,
  ) {
    const emp = employee || this.getEmployee();
    const email = (emp?.email || 'unknown@demo.local').toLowerCase().trim();
    const id = emp?.id || '';
    const name =
      emp?.displayName || (emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : 'PulseTime User');

    let list = this.getDailyStateArray();

    // Clean up entries older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    list = list.filter((item) => item.date >= sevenDaysAgo);

    const existingIndex = list.findIndex(
      (item) =>
        (item.employeeEmail?.toLowerCase() === email || (id && item.employeeId === id)) &&
        item.date === state.date,
    );

    const entry: EmployeeDailyState = {
      employeeEmail: email,
      employeeId: id,
      employeeName: name,
      date: state.date,
      workedSeconds: state.workedSeconds,
      activeSeconds: state.activeSeconds,
      idleSeconds: state.idleSeconds,
      breakSeconds: state.breakSeconds,
      lastPunchOutTime: state.lastPunchOutTime || '',
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = entry;
    } else {
      list.push(entry);
    }

    localStorage.setItem(STORAGE_KEYS.DAILY_STATE, JSON.stringify(list));
  },
};

