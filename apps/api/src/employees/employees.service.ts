import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import * as bcrypt from 'bcryptjs';
import { UserStatus } from '@pulsetime/types';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryEmployeeDto, role?: string, currentEmployeeId?: string) {
    const { page = 1, limit = 20, search, departmentId, managerId, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (role === 'EMPLOYEE') {
      where.id = currentEmployeeId || '__NONE__';
    } else {
      if (status) {
        where.status = status;
      }

      if (departmentId) {
        where.departmentId = departmentId;
      }

      if (managerId) {
        where.managerId = managerId;
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { employeeCode: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          department: true,
          manager: {
            select: { id: true, displayName: true, employeeCode: true },
          },
          user: {
            select: {
              id: true,
              email: true,
              status: true,
              lastLoginAt: true,
              userRoles: {
                where: { organizationId },
                include: { role: true },
              },
            },
          },
          workSessions: {
            where: { status: { in: ['ACTIVE', 'PAUSED'] } },
            take: 1,
            orderBy: { startedAt: 'desc' },
          },
          devices: {
            take: 1,
            orderBy: { lastSeenAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const data = items.map((emp) => {
      const activeSession = emp.workSessions[0] || null;
      let workStatus = 'OFFLINE';
      if (activeSession) {
        workStatus = activeSession.status === 'PAUSED' ? 'ON_BREAK' : 'ACTIVE';
      }

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        displayName: emp.displayName,
        email: emp.email,
        phone: emp.phone,
        status: emp.status,
        department: emp.department?.name || null,
        departmentId: emp.departmentId,
        manager: emp.manager?.displayName || null,
        managerId: emp.managerId,
        role: emp.user?.userRoles[0]?.role.name || 'EMPLOYEE',
        joiningDate: emp.joiningDate,
        timezone: emp.timezone,
        lastLoginAt: emp.user?.lastLoginAt,
        workStatus,
        activeSession: activeSession
          ? {
              id: activeSession.id,
              startedAt: activeSession.startedAt,
              status: activeSession.status,
            }
          : null,
        lastDevice: emp.devices[0]
          ? {
              deviceName: emp.devices[0].deviceName,
              platform: emp.devices[0].platform,
              lastSeenAt: emp.devices[0].lastSeenAt,
            }
          : null,
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(organizationId: string, id: string, role?: string, currentEmployeeId?: string) {
    if (role === 'EMPLOYEE' && id !== currentEmployeeId) {
      throw new ForbiddenException('You do not have permission to view this employee profile');
    }

    const emp = await this.prisma.employee.findFirst({
      where: { id, organizationId },
      include: {
        department: true,
        manager: {
          select: { id: true, displayName: true, employeeCode: true, email: true },
        },
        subordinates: {
          select: { id: true, displayName: true, employeeCode: true, status: true },
        },
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            lastLoginAt: true,
            userRoles: {
              where: { organizationId },
              include: { role: true },
            },
          },
        },
        scheduleAssignments: {
          include: { workSchedule: true },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
        devices: {
          orderBy: { lastSeenAt: 'desc' },
        },
        workSessions: {
          take: 5,
          orderBy: { startedAt: 'desc' },
          include: { project: true, task: true },
        },
        leaveBalances: {
          where: { year: new Date().getFullYear() },
          include: { leaveType: true },
        },
      },
    });

    if (!emp) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return emp;
  }


  async create(organizationId: string, dto: CreateEmployeeDto, actorUserId: string) {
    // 1. Verify employee code uniqueness in org
    const existingCode = await this.prisma.employee.findUnique({
      where: {
        organizationId_employeeCode: {
          organizationId,
          employeeCode: dto.employeeCode,
        },
      },
    });
    if (existingCode) {
      throw new ConflictException(`Employee code '${dto.employeeCode}' already exists in this organization`);
    }

    // 2. Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      const password = dto.password || 'Password123!';
      const passwordHash = await bcrypt.hash(password, 10);
      user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });
    } else if (dto.password) {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }

    // 3. Find Role
    const roleName = dto.roleName || 'EMPLOYEE';
    let role = await this.prisma.role.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: roleName,
        },
      },
    });

    if (!role) {
      role = await this.prisma.role.findFirst({
        where: { organizationId, name: 'EMPLOYEE' },
      });
      if (!role) {
        throw new BadRequestException(`Role ${roleName} does not exist`);
      }
    }

    // 4. Link UserOrganizationRole
    await this.prisma.userOrganizationRole.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
      update: { roleId: role.id },
      create: {
        userId: user.id,
        organizationId,
        roleId: role.id,
      },
    });

    // 5. Create Employee record
    const employee = await this.prisma.employee.create({
      data: {
        organizationId,
        userId: user.id,
        employeeCode: dto.employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName: `${dto.firstName} ${dto.lastName}`,
        email: dto.email.toLowerCase(),
        phone: dto.phone || null,
        departmentId: dto.departmentId || null,
        managerId: dto.managerId || null,
        timezone: dto.timezone || 'Asia/Kolkata',
        status: UserStatus.ACTIVE,
      },
      include: {
        department: true,
        manager: true,
      },
    });

    // 6. Assign schedule
    let scheduleId = dto.workScheduleId;
    if (!scheduleId) {
      const defaultSchedule = await this.prisma.workSchedule.findFirst({
        where: { organizationId, isDefault: true },
      });
      scheduleId = defaultSchedule?.id;
    }

    if (scheduleId) {
      await this.prisma.scheduleAssignment.create({
        data: {
          organizationId,
          employeeId: employee.id,
          workScheduleId: scheduleId,
        },
      });
    }

    // 7. Initialize Leave Balances
    const leaveTypes = await this.prisma.leaveType.findMany({
      where: { organizationId },
    });
    for (const lt of leaveTypes) {
      await this.prisma.leaveBalance.create({
        data: {
          organizationId,
          employeeId: employee.id,
          leaveTypeId: lt.id,
          year: new Date().getFullYear(),
          totalDays: lt.daysAllowed,
          usedDays: 0,
          remainingDays: lt.daysAllowed,
        },
      });
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'CREATE',
        entityType: 'Employee',
        entityId: employee.id,
        newValues: employee as any,
      },
    });

    return employee;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateEmployeeDto,
    actorUserId: string,
  ) {
    const existing = await this.prisma.employee.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const updateData: any = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.firstName || dto.lastName) {
      const fn = dto.firstName || existing.firstName;
      const ln = dto.lastName || existing.lastName;
      updateData.displayName = `${fn} ${ln}`;
    }
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.departmentId !== undefined) updateData.departmentId = dto.departmentId;
    if (dto.managerId !== undefined) updateData.managerId = dto.managerId;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.status !== undefined) updateData.status = dto.status as UserStatus;

    const updated = await this.prisma.employee.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'UPDATE',
        entityType: 'Employee',
        entityId: id,
        oldValues: existing as any,
        newValues: updated as any,
      },
    });

    return updated;
  }

  async remove(organizationId: string, id: string, actorUserId: string) {
    const existing = await this.prisma.employee.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Soft delete/disable
    const updated = await this.prisma.employee.update({
      where: { id },
      data: { status: UserStatus.DISABLED },
    });

    await this.prisma.user.update({
      where: { id: existing.userId },
      data: { status: UserStatus.DISABLED },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'DELETE',
        entityType: 'Employee',
        entityId: id,
      },
    });

    return { message: 'Employee disabled successfully' };
  }
}
