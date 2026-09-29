import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  private organizationId: string | null = null;
  private employeeId: string | null = null;
  private userId: string | null = null;
  private role: string | null = null;
  private permissions: string[] = [];

  setContext(data: {
    organizationId: string;
    employeeId?: string | null;
    userId?: string;
    role?: string;
    permissions?: string[];
  }) {
    this.organizationId = data.organizationId;
    this.employeeId = data.employeeId || null;
    this.userId = data.userId || null;
    this.role = data.role || null;
    this.permissions = data.permissions || [];
  }

  getOrganizationId(): string {
    if (!this.organizationId) {
      throw new Error('Tenant context organizationId has not been initialized for this request');
    }
    return this.organizationId;
  }

  getEmployeeId(): string | null {
    return this.employeeId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  getRole(): string | null {
    return this.role;
  }

  getPermissions(): string[] {
    return this.permissions;
  }

  hasPermission(permission: string): boolean {
    if (this.role === 'OWNER') return true;
    return this.permissions.includes(permission);
  }
}
