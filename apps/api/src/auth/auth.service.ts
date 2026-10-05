import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AgentLoginDto } from './dto/agent-login.dto';
import * as bcrypt from 'bcryptjs';
import { AuthResult, UserStatus } from '@pulsetime/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUserCredentials(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        userRoles: {
          include: {
            organization: true,
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        employees: {
          include: {
            organization: true,
            department: true,
            scheduleAssignments: {
              where: {
                effectiveFrom: { lte: new Date() },
                OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
              },
              include: { workSchedule: true },
              orderBy: { effectiveFrom: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(`User account is ${user.status.toLowerCase()}`);
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResult> {
    const user = await this.validateUserCredentials(loginDto.email, loginDto.password);

    const userOrgRole = user.userRoles[0];
    if (!userOrgRole) {
      throw new ForbiddenException('User has no assigned organization or role');
    }

    const org = userOrgRole.organization;
    const role = userOrgRole.role;
    const permissions = role.rolePermissions.map((rp) => rp.permission.key);
    const employee = user.employees.find((e) => e.organizationId === org.id) || null;

    const tokens = await this.generateTokens({
      userId: user.id,
      email: user.email,
      organizationId: org.id,
      role: role.name,
      permissions,
      employeeId: employee?.id,
      userAgent,
    });

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorUserId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        status: user.status as UserStatus,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      },
      employee: employee
        ? {
            id: employee.id,
            organizationId: employee.organizationId,
            displayName: employee.displayName,
            employeeCode: employee.employeeCode,
            timezone: employee.timezone,
          }
        : null,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        timezone: org.timezone,
      },
      role: role.name,
      permissions,
      tokens,
    };
  }

  async agentLogin(dto: AgentLoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.validateUserCredentials(dto.email, dto.password);

    const userOrgRole = user.userRoles[0];
    if (!userOrgRole) {
      throw new ForbiddenException('User is not associated with an organization');
    }

    const org = userOrgRole.organization;
    const role = userOrgRole.role;
    const permissions = role.rolePermissions.map((rp) => rp.permission.key);
    const employee = user.employees.find((e) => e.organizationId === org.id);

    if (!employee) {
      throw new ForbiddenException('No active employee profile associated with this account');
    }

    // Register or update device
    const device = await this.prisma.device.upsert({
      where: {
        organizationId_employeeId_deviceIdentifier: {
          organizationId: org.id,
          employeeId: employee.id,
          deviceIdentifier: dto.deviceIdentifier,
        },
      },
      update: {
        deviceName: dto.deviceName,
        platform: dto.platform,
        platformVersion: dto.platformVersion || null,
        appVersion: dto.appVersion || null,
        lastSeenAt: new Date(),
        status: 'ACTIVE',
      },
      create: {
        organizationId: org.id,
        employeeId: employee.id,
        deviceIdentifier: dto.deviceIdentifier,
        deviceName: dto.deviceName,
        platform: dto.platform,
        platformVersion: dto.platformVersion || null,
        appVersion: dto.appVersion || null,
        lastSeenAt: new Date(),
        status: 'ACTIVE',
      },
    });

    const tokens = await this.generateTokens({
      userId: user.id,
      email: user.email,
      organizationId: org.id,
      role: role.name,
      permissions,
      employeeId: employee.id,
      deviceId: device.id,
      userAgent,
    });

    // Check current active or paused session
    const currentSession = await this.prisma.workSession.findFirst({
      where: {
        organizationId: org.id,
        employeeId: employee.id,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
      include: {
        breaks: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
        project: true,
        task: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    const activeSchedule = employee.scheduleAssignments[0]?.workSchedule || null;

    return {
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        displayName: employee.displayName,
        email: employee.email,
        employeeCode: employee.employeeCode,
        timezone: employee.timezone,
        department: employee.department?.name,
      },
      organization: {
        id: org.id,
        name: org.name,
        timezone: org.timezone,
        dayResetTime: org.dayResetTime,
        screenshotIntervalMinutes: org.screenshotIntervalMinutes,
        idleThresholdMinutes: org.idleThresholdMinutes,
        activityTrackingEnabled: org.activityTrackingEnabled,
        screenshotTrackingEnabled: org.screenshotTrackingEnabled,
      },
      device: {
        id: device.id,
        deviceIdentifier: device.deviceIdentifier,
        deviceName: device.deviceName,
        platform: device.platform,
      },
      schedule: activeSchedule,
      currentSession: currentSession
        ? {
            id: currentSession.id,
            status: currentSession.status,
            startedAt: currentSession.startedAt.toISOString(),
            projectId: currentSession.projectId,
            taskId: currentSession.taskId,
            currentBreak: currentSession.breaks[0] || null,
          }
        : null,
      tokens,
    };
  }

  async refreshTokens(refreshTokenStr: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshTokenStr, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'pulsetime_dev_refresh_secret_super_secure_key_67890'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh' || !payload.sub || !payload.organizationId) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const tokenRecords = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    let validRecord: any = null;
    for (const rec of tokenRecords) {
      const match = await bcrypt.compare(refreshTokenStr, rec.tokenHash);
      if (match) {
        validRecord = rec;
        break;
      }
    }

    if (!validRecord) {
      throw new UnauthorizedException('Refresh token is revoked or unrecognized');
    }

    // Revoke old token (token rotation)
    await this.prisma.refreshToken.update({
      where: { id: validRecord.id },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          where: { organizationId: payload.organizationId },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        employees: {
          where: { organizationId: payload.organizationId },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is no longer active');
    }

    const orgRole = user.userRoles[0]?.role;
    const permissions = orgRole?.rolePermissions.map((rp) => rp.permission.key) || [];
    const employee = user.employees[0] || null;

    return await this.generateTokens({
      userId: user.id,
      email: user.email,
      organizationId: payload.organizationId,
      role: orgRole?.name || 'EMPLOYEE',
      permissions,
      employeeId: employee?.id,
    });
  }

  async logout(userId: string, refreshTokenStr?: string) {
    if (refreshTokenStr) {
      const tokens = await this.prisma.refreshToken.findMany({
        where: { userId, isRevoked: false },
      });
      for (const t of tokens) {
        const isMatch = await bcrypt.compare(refreshTokenStr, t.tokenHash);
        if (isMatch) {
          await this.prisma.refreshToken.update({
            where: { id: t.id },
            data: { isRevoked: true },
          });
          break;
        }
      }
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(params: {
    userId: string;
    email: string;
    organizationId: string;
    role: string;
    permissions: string[];
    employeeId?: string | null;
    deviceId?: string;
    userAgent?: string;
  }) {
    const accessPayload = {
      sub: params.userId,
      email: params.email,
      organizationId: params.organizationId,
      role: params.role,
      permissions: params.permissions,
      employeeId: params.employeeId,
      type: 'access',
    };

    const refreshPayload = {
      sub: params.userId,
      organizationId: params.organizationId,
      type: 'refresh',
    };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET', 'pulsetime_dev_access_secret_super_secure_key_12345');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET', 'pulsetime_dev_refresh_secret_super_secure_key_67890');

    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '24h');
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        userId: params.userId,
        tokenHash,
        deviceId: params.deviceId || null,
        userAgent: params.userAgent || null,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400, // 24 hours
    };
  }

  async getProfile(userId: string, organizationId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          where: { organizationId },
          include: {
            organization: true,
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        employees: {
          where: { organizationId },
          include: {
            department: true,
            manager: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const orgRole = user.userRoles[0];
    const employee = user.employees[0] || null;

    return {
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      employee: employee
        ? {
            id: employee.id,
            displayName: employee.displayName,
            employeeCode: employee.employeeCode,
            email: employee.email,
            phone: employee.phone,
            department: employee.department?.name,
            timezone: employee.timezone,
            managerName: employee.manager?.displayName,
          }
        : null,
      organization: {
        id: orgRole?.organization.id,
        name: orgRole?.organization.name,
        slug: orgRole?.organization.slug,
        timezone: orgRole?.organization.timezone,
      },
      role: orgRole?.role.name,
      permissions: orgRole?.role.rolePermissions.map((rp) => rp.permission.key) || [],
    };
  }
}
