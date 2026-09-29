// Shared Enums
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INVITED = 'INVITED',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
}

export enum SystemRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum PlatformType {
  WINDOWS = 'WINDOWS',
  MACOS = 'MACOS',
  LINUX = 'LINUX',
}

export enum WorkSessionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  AUTO_ENDED = 'AUTO_ENDED',
  FORCED_ENDED = 'FORCED_ENDED',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LEAVE = 'LEAVE',
  HOLIDAY = 'HOLIDAY',
  WORK_FROM_HOME = 'WORK_FROM_HOME',
  PARTIAL_DAY = 'PARTIAL_DAY',
  LATE = 'LATE',
  EARLY_LEAVE = 'EARLY_LEAVE',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum TimeApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  COMPLETED = 'COMPLETED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  EXPORT = 'EXPORT',
}

// Granular System Permissions
export const GranularPermissions = [
  'employees.view',
  'employees.create',
  'employees.update',
  'employees.delete',
  'attendance.view',
  'attendance.edit',
  'attendance.approve',
  'screenshots.view',
  'screenshots.delete',
  'projects.view',
  'projects.create',
  'projects.update',
  'projects.delete',
  'tasks.view',
  'tasks.create',
  'tasks.update',
  'tasks.delete',
  'reports.view',
  'reports.export',
  'leaves.view',
  'leaves.apply',
  'leaves.approve',
  'settings.view',
  'settings.update',
  'roles.view',
  'roles.manage',
] as const;

export type PermissionKey = (typeof GranularPermissions)[number];

// Standard API Response Envelope
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    [key: string]: any;
  };
}

// JWT Token Payload
export interface JwtPayload {
  sub: string; // userId
  email: string;
  organizationId: string;
  role: string;
  permissions: string[];
  employeeId?: string;
  type: 'access' | 'refresh';
}

// Auth Login Results
export interface AuthResult {
  user: {
    id: string;
    email: string;
    status: UserStatus;
    lastLoginAt?: string | null;
  };
  employee?: {
    id: string;
    organizationId: string;
    displayName: string;
    employeeCode: string;
    timezone: string;
  } | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  };
  role: string;
  permissions: string[];
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// Heartbeat Ingestion Payload
export interface ActivityHeartbeatPayload {
  deviceId?: string;
  sessionId: string;
  capturedAt: string;
  activeSeconds: number;
  idleSeconds: number;
  activeApplication?: string;
  windowTitle?: string;
  keysPressed?: number;
  mouseClicks?: number;
}

// Screenshot Complete Payload
export interface ScreenshotCompletePayload {
  sessionId: string;
  storageKey: string;
  capturedAt: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  activityPercentage?: number;
  projectId?: string;
  taskId?: string;
}

// Timeline segment interface
export interface TimelineSegment {
  type: 'active' | 'idle' | 'break' | 'meeting' | 'manual';
  startTime: string; // ISO string
  endTime: string;   // ISO string
  durationSeconds: number;
  percentage?: number;
  metadata?: {
    application?: string;
    notes?: string;
    breakReason?: string;
  };
}

// Employee Summary item
export interface EmployeeSummaryMetric {
  employeeId: string;
  displayName: string;
  employeeCode: string;
  departmentName?: string;
  totalWorkedSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  breakSeconds: number;
  manualSeconds: number;
  meetingSeconds: number;
  activePercentage: number;
  formattedWorked: string; // e.g. "07:45"
  formattedActive: string; // e.g. "06:30"
  formattedIdle: string;   // e.g. "01:15"
  sessionsCount: number;
  screenshotsCount: number;
  status: 'ACTIVE' | 'ON_BREAK' | 'IDLE' | 'OFFLINE';
}
