export type SessionStatus = 'OFFLINE' | 'ACTIVE' | 'BREAK' | 'IDLE_WARNING' | 'IDLE';

export interface IdleConfig {
  gracePeriodSeconds: number; // default 60 (or 10 in test mode)
  warningDurationSeconds: number; // default 60 (or 10 in test mode)
  isTestMode: boolean; // default false
}

export interface EmployeeInfo {
  id: string;
  userId: string;
  organizationId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  timezone: string;
}

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  dayResetTime: string;
  screenshotIntervalMinutes: number;
  idleThresholdMinutes: number;
  allowManualTime: boolean;
}

export interface DeviceInfo {
  id: string;
  deviceIdentifier: string;
  deviceName: string;
  platform: 'WINDOWS' | 'MACOS' | 'LINUX';
  platformVersion: string;
  appVersion: string;
}

export interface WorkScheduleInfo {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  allowedPunchInBeforeMinutes: number;
  autoPunchOutTime: string | null;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
}

export interface ActiveSession {
  id: string;
  organizationId?: string;
  employeeId?: string;
  deviceId?: string;
  projectId?: string | null;
  taskId?: string | null;
  notes?: string | null;
  startedAt: string;
  endedAt?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  durationSeconds?: number;
  breaks?: Array<{
    id: string;
    startedAt: string;
    endedAt?: string;
    durationSeconds: number;
    reason?: string;
  }>;
}

export interface CapturedScreenshot {
  id: string;
  timestamp: string;
  dataUrl: string;
  activityPercentage: number;
  storageKey: string;
}

export interface OfflineQueueItem {
  id: string;
  type:
    | 'HEARTBEAT'
    | 'SCREENSHOT_METADATA'
    | 'SESSION_START'
    | 'SESSION_STOP'
    | 'SESSION_BREAK_START'
    | 'SESSION_BREAK_END'
    | 'OFFLINE_SESSION';
  endpoint: string;
  payload: any;
  createdAt: string;
  retries: number;
}

export interface EmployeeDailyState {
  employeeId?: string;
  employeeEmail: string;
  employeeName?: string;
  date: string;
  workedSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  breakSeconds: number;
  lastPunchOutTime?: string;
  updatedAt?: string;
}

