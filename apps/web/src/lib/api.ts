const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://timelogger-dy6t.onrender.com') + '/api/v1';

export interface ApiFetchOptions extends RequestInit {
  params?: Record<string, any>;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('pulsetime_refresh') : null;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const payload = json.data || json;
    const tokens = payload?.tokens || payload;
    if (tokens?.accessToken) {
      localStorage.setItem('pulsetime_token', tokens.accessToken);
      if (tokens.refreshToken) {
        localStorage.setItem('pulsetime_refresh', tokens.refreshToken);
      }
      return tokens.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiFetch<T = any>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { params, headers = {}, ...customConfig } = options;

  let url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('pulsetime_token') : null;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  };

  let response = await fetch(url, config);

  if (
    response.status === 401 &&
    typeof window !== 'undefined' &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh')
  ) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await tryRefreshToken();
      isRefreshing = false;
      if (newToken) {
        onTokenRefreshed(newToken);
        const retryHeaders = {
          ...config.headers,
          Authorization: `Bearer ${newToken}`,
        };
        response = await fetch(url, { ...config, headers: retryHeaders });
      } else {
        if (!window.location.pathname.includes('/login')) {
          localStorage.removeItem('pulsetime_token');
          localStorage.removeItem('pulsetime_refresh');
          localStorage.removeItem('pulsetime_user');
          window.location.href = '/login';
        }
      }
    } else {
      const newToken = await new Promise<string | null>((resolve) => {
        addRefreshSubscriber((token) => resolve(token));
      });
      if (newToken) {
        const retryHeaders = {
          ...config.headers,
          Authorization: `Bearer ${newToken}`,
        };
        response = await fetch(url, { ...config, headers: retryHeaders });
      }
    }
  }

  // If download / CSV response
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return (await response.text()) as unknown as T;
  }

  const data = await response.json();

  if (!response.ok || data.success === false) {
    const errorMessage = data.error?.message || data.message || 'An error occurred';
    throw new Error(errorMessage);
  }

  return data.data !== undefined ? data.data : data;
}

export const api = {
  // Auth
  login: (body: any) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiFetch('/auth/me'),
  logout: (refreshToken?: string) => apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  // Organizations
  getSettings: () => apiFetch('/organizations/settings'),
  updateSettings: (body: any) => apiFetch('/organizations/settings', { method: 'PUT', body: JSON.stringify(body) }),
  resetActivityData: () => apiFetch('/organizations/reset-activity-data', { method: 'POST' }),

  // Employees
  getEmployees: (params?: any) => apiFetch('/employees', { params }),
  getEmployee: (id: string) => apiFetch(`/employees/${id}`),
  createEmployee: (body: any) => apiFetch('/employees', { method: 'POST', body: JSON.stringify(body) }),
  updateEmployee: (id: string, body: any) => apiFetch(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteEmployee: (id: string) => apiFetch(`/employees/${id}`, { method: 'DELETE' }),

  // Departments
  getDepartments: () => apiFetch('/departments'),
  createDepartment: (body: any) => apiFetch('/departments', { method: 'POST', body: JSON.stringify(body) }),

  // Schedules
  getSchedules: () => apiFetch('/schedules'),
  getSchedule: (id: string) => apiFetch(`/schedules/${id}`),
  createSchedule: (body: any) => apiFetch('/schedules', { method: 'POST', body: JSON.stringify(body) }),
  updateSchedule: (id: string, body: any) => apiFetch(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  assignSchedule: (body: any) => apiFetch('/schedules/assign', { method: 'POST', body: JSON.stringify(body) }),

  // Devices
  getDevices: () => apiFetch('/devices'),
  getEmployeeDevices: (employeeId: string) => apiFetch(`/devices/employee/${employeeId}`),

  // Work Sessions
  getSessions: (params?: any) => apiFetch('/work-sessions', { params }),
  getSession: (id: string) => apiFetch(`/work-sessions/${id}`),
  deleteWorkSession: (id: string) => apiFetch(`/work-sessions/${id}`, { method: 'DELETE' }),
  updateWorkSessionNotes: (id: string, notes: string) => apiFetch(`/work-sessions/${id}/notes`, { method: 'PATCH', body: JSON.stringify({ notes }) }),

  // Activity
  getActivitySummary: (params?: any) => apiFetch('/activity/summary', { params }),

  // Screenshots
  getScreenshots: (params?: any) => apiFetch('/screenshots', { params }),
  getScreenshot: (id: string) => apiFetch(`/screenshots/${id}`),
  deleteScreenshot: (id: string) => apiFetch(`/screenshots/${id}`, { method: 'DELETE' }),

  // Projects & Tasks
  getProjects: () => apiFetch('/projects'),
  getProject: (id: string) => apiFetch(`/projects/${id}`),
  createProject: (body: any) => apiFetch('/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id: string, body: any) => apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  addProjectMember: (projectId: string, body: any) => apiFetch(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(body) }),

  getTasks: (params?: any) => apiFetch('/tasks', { params }),
  getTask: (id: string) => apiFetch(`/tasks/${id}`),
  createTask: (body: any) => apiFetch('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: string, body: any) => apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateTaskStatus: (id: string, status: string) => apiFetch(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Attendance
  getDailyOverview: (params?: any) => apiFetch('/attendance/daily-overview', { params }),
  getAttendance: (params?: any) => apiFetch('/attendance', { params }),

  // Leaves
  getLeaveTypes: () => apiFetch('/leaves/types'),
  getLeaveBalances: (params?: any) => apiFetch('/leaves/balances', { params }),
  getLeaveRequests: (params?: any) => apiFetch('/leaves/requests', { params }),
  applyLeave: (body: any) => apiFetch('/leaves/requests', { method: 'POST', body: JSON.stringify(body) }),
  approveLeave: (id: string) => apiFetch(`/leaves/requests/${id}/approve`, { method: 'POST' }),
  rejectLeave: (id: string, body?: any) => apiFetch(`/leaves/requests/${id}/reject`, { method: 'POST', body: JSON.stringify(body || {}) }),

  // Time entries & approvals
  getTimeEntries: (params?: any) => apiFetch('/time-entries', { params }),
  createTimeEntry: (body: any) => apiFetch('/time-entries', { method: 'POST', body: JSON.stringify(body) }),
  approveTimeEntry: (id: string) => apiFetch(`/time-entries/${id}/approve`, { method: 'POST' }),
  rejectTimeEntry: (id: string, body?: any) => apiFetch(`/time-entries/${id}/reject`, { method: 'POST', body: JSON.stringify(body || {}) }),

  // Reports
  getEmployeeSummary: (params?: any) => apiFetch('/reports/employee-summary', { params }),
  getTimeline: (params?: any) => apiFetch('/reports/timeline', { params }),
  getExportUrl: (params?: any) => {
    const query = new URLSearchParams(params || {}).toString();
    return `${API_BASE}/reports/export${query ? `?${query}` : ''}`;
  },

  // Roles & RBAC
  getRoles: () => apiFetch('/roles'),
  getPermissions: () => apiFetch('/roles/permissions'),
  createRole: (body: any) => apiFetch('/roles', { method: 'POST', body: JSON.stringify(body) }),
  updateRole: (id: string, body: any) => apiFetch(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // Audit Logs
  getAuditLogs: (params?: any) => apiFetch('/audit-logs', { params }),
};
