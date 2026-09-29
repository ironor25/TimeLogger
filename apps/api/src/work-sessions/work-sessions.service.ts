import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartSessionDto, StopSessionDto, StartBreakDto, EndBreakDto } from './dto/start-session.dto';
import { QuerySessionDto } from './dto/query-session.dto';
import { WorkSessionStatus, AttendanceStatus } from '@pulsetime/types';

@Injectable()
export class WorkSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async startSession(
    organizationId: string,
    employeeId: string,
    dto: StartSessionDto,
    ipAddress?: string,
  ) {
    // 1. Verify Employee status
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: {
        organization: true,
        scheduleAssignments: {
          include: { workSchedule: true },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
    });

    if (!employee || employee.status !== 'ACTIVE') {
      throw new ForbiddenException('Employee is not active or not in organization');
    }

    // 2. Check for duplicate active/paused session
    const existing = await this.prisma.workSession.findFirst({
      where: {
        organizationId,
        employeeId,
        status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.PAUSED] },
      },
      include: {
        breaks: { where: { endedAt: null } },
        project: true,
        task: true,
      },
    });

    if (existing) {
      throw new ConflictException({
        message: 'Employee already has an active or paused work session',
        session: existing,
      });
    }

    // 3. Resolve Device
    let deviceId = dto.deviceId || null;
    if (deviceId) {
      const dev = await this.prisma.device.findFirst({
        where: { id: deviceId, organizationId, employeeId },
      });
      if (dev) {
        await this.prisma.device.update({
          where: { id: dev.id },
          data: { lastSeenAt: new Date() },
        });
      } else {
        deviceId = null;
      }
    }

    // 4. Server authoritative start time
    const now = new Date();

    const session = await this.prisma.workSession.create({
      data: {
        organizationId,
        employeeId,
        deviceId,
        projectId: dto.projectId || null,
        taskId: dto.taskId || null,
        startedAt: now,
        status: WorkSessionStatus.ACTIVE,
        timezone: employee.timezone,
        startSource: 'DESKTOP_AGENT',
        notes: dto.notes || null,
        ipAddress: ipAddress || null,
      },
      include: {
        project: true,
        task: true,
        device: true,
      },
    });

    // 5. Update or create today's AttendanceRecord
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendanceRecord.findUnique({
      where: {
        organizationId_employeeId_date: {
          organizationId,
          employeeId,
          date: today,
        },
      },
    });

    if (!attendance) {
      await this.prisma.attendanceRecord.create({
        data: {
          organizationId,
          employeeId,
          date: today,
          status: AttendanceStatus.PRESENT,
          firstPunchIn: now,
        },
      });
    } else if (!attendance.firstPunchIn) {
      await this.prisma.attendanceRecord.update({
        where: { id: attendance.id },
        data: {
          firstPunchIn: now,
          status: AttendanceStatus.PRESENT,
        },
      });
    }

    return session;
  }

  async stopSession(
    organizationId: string,
    employeeId: string,
    dto: StopSessionDto,
  ) {
    const whereClause: any = {
      organizationId,
      employeeId,
      status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.PAUSED] },
    };
    if (dto.sessionId) {
      whereClause.id = dto.sessionId;
    }

    const session = await this.prisma.workSession.findFirst({
      where: whereClause,
      include: {
        breaks: { where: { endedAt: null } },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) {
      throw new NotFoundException('No active or paused session found to stop');
    }

    const now = new Date();

    // End any open break first
    if (session.breaks && session.breaks.length > 0) {
      for (const b of session.breaks) {
        const breakDur = Math.max(0, Math.floor((now.getTime() - b.startedAt.getTime()) / 1000));
        await this.prisma.workSessionBreak.update({
          where: { id: b.id },
          data: {
            endedAt: now,
            durationSeconds: breakDur,
          },
        });
      }
    }

    // Authoritative duration
    const totalDurationSeconds = Math.max(
      0,
      Math.floor((now.getTime() - session.startedAt.getTime()) / 1000),
    );

    const updated = await this.prisma.workSession.update({
      where: { id: session.id },
      data: {
        endedAt: now,
        durationSeconds: totalDurationSeconds,
        status: WorkSessionStatus.COMPLETED,
        endSource: 'MANUAL_STOP',
        notes: dto.notes ? (session.notes ? `${session.notes} | ${dto.notes}` : dto.notes) : session.notes,
      },
      include: {
        project: true,
        task: true,
        breaks: true,
      },
    });

    // Update AttendanceRecord
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendanceRecord.findUnique({
      where: {
        organizationId_employeeId_date: {
          organizationId,
          employeeId,
          date: today,
        },
      },
    });

    if (attendance) {
      await this.prisma.attendanceRecord.update({
        where: { id: attendance.id },
        data: {
          lastPunchOut: now,
          totalWorkSeconds: { increment: totalDurationSeconds },
        },
      });
    }

    return updated;
  }

  async startBreak(
    organizationId: string,
    employeeId: string,
    dto: StartBreakDto,
  ) {
    const session = await this.prisma.workSession.findFirst({
      where: {
        organizationId,
        employeeId,
        status: WorkSessionStatus.ACTIVE,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) {
      throw new BadRequestException('Cannot start a break without an active work session');
    }

    const now = new Date();

    const [breakRecord] = await Promise.all([
      this.prisma.workSessionBreak.create({
        data: {
          organizationId,
          workSessionId: session.id,
          employeeId,
          startedAt: now,
          reason: dto.reason || 'Break',
        },
      }),
      this.prisma.workSession.update({
        where: { id: session.id },
        data: { status: WorkSessionStatus.PAUSED },
      }),
    ]);

    return breakRecord;
  }

  async endBreak(
    organizationId: string,
    employeeId: string,
    dto: EndBreakDto,
  ) {
    const session = await this.prisma.workSession.findFirst({
      where: {
        organizationId,
        employeeId,
        status: WorkSessionStatus.PAUSED,
      },
      include: {
        breaks: {
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!session || !session.breaks[0]) {
      throw new BadRequestException('No ongoing break found to end');
    }

    const currentBreak = session.breaks[0];
    const now = new Date();
    const breakDuration = Math.max(0, Math.floor((now.getTime() - currentBreak.startedAt.getTime()) / 1000));

    const [updatedBreak] = await Promise.all([
      this.prisma.workSessionBreak.update({
        where: { id: currentBreak.id },
        data: {
          endedAt: now,
          durationSeconds: breakDuration,
        },
      }),
      this.prisma.workSession.update({
        where: { id: session.id },
        data: { status: WorkSessionStatus.ACTIVE },
      }),
    ]);

    return updatedBreak;
  }

  async getCurrentSession(organizationId: string, employeeId: string) {
    const session = await this.prisma.workSession.findFirst({
      where: {
        organizationId,
        employeeId,
        status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.PAUSED] },
      },
      include: {
        project: true,
        task: true,
        device: true,
        breaks: {
          where: { endedAt: null },
          take: 1,
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!session) {
      return null;
    }

    const now = new Date();
    const currentDurationSeconds = Math.max(
      0,
      Math.floor((now.getTime() - session.startedAt.getTime()) / 1000),
    );

    return {
      ...session,
      currentDurationSeconds,
      currentBreak: session.breaks[0] || null,
    };
  }

  async getEmployeeHistory(organizationId: string, employeeId: string, limit: number = 20) {
    return this.prisma.workSession.findMany({
      where: { organizationId, employeeId },
      include: {
        project: true,
        task: true,
        breaks: true,
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async findAll(organizationId: string, query: QuerySessionDto) {
    const { page = 1, limit = 20, employeeId, projectId, status, date } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (employeeId) where.employeeId = employeeId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      where.startedAt = { gte: startOfDay, lte: endOfDay };
    }

    const [total, items] = await Promise.all([
      this.prisma.workSession.count({ where }),
      this.prisma.workSession.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              displayName: true,
              employeeCode: true,
              department: { select: { name: true } },
            },
          },
          project: { select: { id: true, name: true, code: true } },
          task: { select: { id: true, title: true } },
          device: { select: { deviceName: true, platform: true } },
          breaks: true,
          _count: {
            select: { screenshots: true, activityRecords: true },
          },
        },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(organizationId: string, id: string) {
    const session = await this.prisma.workSession.findFirst({
      where: { id, organizationId },
      include: {
        employee: {
          select: {
            id: true,
            displayName: true,
            employeeCode: true,
            email: true,
            department: true,
          },
        },
        project: true,
        task: true,
        device: true,
        breaks: true,
        activityRecords: {
          take: 50,
          orderBy: { capturedAt: 'desc' },
        },
        screenshots: {
          take: 20,
          orderBy: { capturedAt: 'desc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return session;
  }

  async deleteSession(organizationId: string, id: string) {
    const session = await this.prisma.workSession.findFirst({
      where: { id, organizationId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    // Delete associated breaks, activity records, and screenshots
    await this.prisma.$transaction([
      this.prisma.workSessionBreak.deleteMany({ where: { workSessionId: id } }),
      this.prisma.activityRecord.deleteMany({ where: { workSessionId: id } }),
      this.prisma.screenshot.deleteMany({ where: { workSessionId: id } }),
      this.prisma.workSession.delete({ where: { id } }),
    ]);

    return { success: true, message: 'Session deleted successfully' };
  }

  async updateNotes(organizationId: string, id: string, notes: string) {
    const session = await this.prisma.workSession.findFirst({
      where: { id, organizationId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${id} not found`);
    }

    return this.prisma.workSession.update({
      where: { id },
      data: { notes },
    });
  }

  async getTodaySummary(organizationId: string, employeeId: string, clientDate?: string) {
    const todayStr = clientDate || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${todayStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${todayStr}T23:59:59.999Z`);
    const now = new Date();

    const [sessions, screenshots, breaks] = await Promise.all([
      this.prisma.workSession.findMany({
        where: {
          organizationId,
          employeeId,
          startedAt: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          project: true,
          task: true,
          breaks: true,
        },
        orderBy: { startedAt: 'asc' },
      }),
      this.prisma.screenshot.findMany({
        where: {
          organizationId,
          employeeId,
          capturedAt: { gte: startOfDay, lte: endOfDay },
          isDeleted: false,
        },
        select: {
          id: true,
          capturedAt: true,
          storageKey: true,
          activityPercentage: true,
        },
        orderBy: { capturedAt: 'desc' },
      }),
      this.prisma.workSessionBreak.findMany({
        where: {
          organizationId,
          employeeId,
          startedAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    let totalWorkedSeconds = 0;
    let totalBreakSeconds = 0;
    let activeSession: any = null;
    let lastPunchOutTime: string = '';

    for (const sess of sessions) {
      if (sess.status === WorkSessionStatus.ACTIVE || sess.status === WorkSessionStatus.PAUSED) {
        activeSession = sess;
        const currentElapsed = Math.max(0, Math.floor((now.getTime() - sess.startedAt.getTime()) / 1000));
        totalWorkedSeconds += currentElapsed;
      } else {
        const dur = sess.durationSeconds || Math.max(0, Math.floor(((sess.endedAt || sess.startedAt).getTime() - sess.startedAt.getTime()) / 1000));
        totalWorkedSeconds += dur;
        if (sess.endedAt) {
          lastPunchOutTime = new Date(sess.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
    }

    for (const b of breaks) {
      if (b.durationSeconds) {
        totalBreakSeconds += b.durationSeconds;
      } else if (!b.endedAt && b.startedAt) {
        totalBreakSeconds += Math.max(0, Math.floor((now.getTime() - b.startedAt.getTime()) / 1000));
      }
    }

    const totalActiveSeconds = Math.max(0, totalWorkedSeconds - totalBreakSeconds);
    const totalIdleSeconds = 0;

    return {
      date: todayStr,
      workedSeconds: totalActiveSeconds,
      activeSeconds: totalActiveSeconds,
      idleSeconds: totalIdleSeconds,
      breakSeconds: totalBreakSeconds,
      screenshotCount: screenshots.length,
      recentScreenshots: screenshots.slice(0, 10),
      lastPunchOutTime,
      activeSession: activeSession
        ? {
            ...activeSession,
            currentDurationSeconds: Math.max(0, Math.floor((now.getTime() - activeSession.startedAt.getTime()) / 1000)),
            currentBreak: activeSession.breaks?.find((b: any) => !b.endedAt) || null,
          }
        : null,
    };
  }

  async syncOfflineSession(
    organizationId: string,
    employeeId: string,
    dto: {
      clientSessionId?: string;
      startedAt: string;
      endedAt?: string;
      durationSeconds?: number;
      projectId?: string;
      taskId?: string;
      notes?: string;
      deviceId?: string;
    },
  ) {
    const startedAt = new Date(dto.startedAt);
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : null;
    const durationSeconds =
      dto.durationSeconds ||
      (endedAt ? Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)) : 0);
    const status = endedAt ? WorkSessionStatus.COMPLETED : WorkSessionStatus.ACTIVE;

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
    });

    const session = await this.prisma.workSession.create({
      data: {
        organizationId,
        employeeId,
        deviceId: dto.deviceId || null,
        projectId: dto.projectId || null,
        taskId: dto.taskId || null,
        startedAt,
        endedAt,
        durationSeconds,
        status,
        timezone: employee?.timezone || 'UTC',
        startSource: 'DESKTOP_AGENT',
        endSource: endedAt ? 'OFFLINE_SYNC' : null,
        notes: dto.notes ? `[Offline Sync] ${dto.notes}` : '[Offline Sync]',
      },
      include: {
        project: true,
        task: true,
      },
    });

    return session;
  }
}
