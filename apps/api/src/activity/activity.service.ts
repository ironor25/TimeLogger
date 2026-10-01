import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityHeartbeatDto } from './dto/heartbeat.dto';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async ingestHeartbeat(
    organizationId: string,
    employeeId: string,
    dto: ActivityHeartbeatDto,
  ) {
    // 1. Authoritative verification: Session must belong to employee & organization
    const session = await this.prisma.workSession.findFirst({
      where: {
        id: dto.sessionId,
        organizationId,
        employeeId,
      },
    });

    if (!session) {
      throw new NotFoundException('Work session not found or does not belong to this employee');
    }

    const capturedAt = new Date(dto.capturedAt);

    // Allow heartbeats for ACTIVE/PAUSED sessions, and also for COMPLETED sessions if capturedAt falls within session timeframe (e.g. offline synchronization)
    if (session.status !== 'ACTIVE' && session.status !== 'PAUSED') {
      const sessEnd = session.endedAt ? new Date(session.endedAt) : null;
      const sessStart = new Date(session.startedAt);
      if (sessEnd && (capturedAt < new Date(sessStart.getTime() - 10000) || capturedAt > new Date(sessEnd.getTime() + 60000))) {
        throw new ForbiddenException(`Cannot record activity outside session timeframe for a ${session.status.toLowerCase()} session`);
      }
    }

    // 3. Resolve Device
    let deviceId = dto.deviceId || session.deviceId;
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

    // 4. Idempotency Check: Prevent duplicate activity ingestion on retry
    const existing = await this.prisma.activityRecord.findFirst({
      where: {
        organizationId,
        employeeId,
        workSessionId: session.id,
        capturedAt,
      },
    });

    if (existing) {
      return {
        recorded: true,
        activityRecordId: existing.id,
        capturedAt: existing.capturedAt,
        duplicate: true,
      };
    }

    // 5. Create Activity Record
    const record = await this.prisma.activityRecord.create({
      data: {
        organizationId,
        employeeId,
        workSessionId: session.id,
        deviceId,
        capturedAt,
        activeSeconds: dto.activeSeconds,
        idleSeconds: dto.idleSeconds,
        activeApplication: dto.activeApplication || null,
        windowTitle: dto.windowTitle || null,
        keysPressed: dto.keysPressed || 0,
        mouseClicks: dto.mouseClicks || 0,
      },
    });

    // 5. Increment daily attendance active/idle counters
    const today = new Date(capturedAt);
    today.setHours(0, 0, 0, 0);

    await this.prisma.attendanceRecord.updateMany({
      where: {
        organizationId,
        employeeId,
        date: today,
      },
      data: {
        totalActiveSeconds: { increment: dto.activeSeconds },
        totalIdleSeconds: { increment: dto.idleSeconds },
      },
    });

    return {
      recorded: true,
      activityRecordId: record.id,
      capturedAt: record.capturedAt,
    };
  }

  async getActivitySummary(
    organizationId: string,
    options: { employeeId?: string; date?: string },
  ) {
    const where: any = { organizationId };
    if (options.employeeId) where.employeeId = options.employeeId;
    if (options.date) {
      const startOfDay = new Date(`${options.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${options.date}T23:59:59.999Z`);
      where.capturedAt = { gte: startOfDay, lte: endOfDay };
    }

    const records = await this.prisma.activityRecord.findMany({
      where,
      select: {
        activeSeconds: true,
        idleSeconds: true,
        activeApplication: true,
      },
      take: 1000,
    });

    let totalActive = 0;
    let totalIdle = 0;
    const appMap: Record<string, number> = {};

    for (const r of records) {
      totalActive += r.activeSeconds;
      totalIdle += r.idleSeconds;
      const app = r.activeApplication || 'Unknown';
      appMap[app] = (appMap[app] || 0) + r.activeSeconds;
    }

    const topApplications = Object.entries(appMap)
      .map(([name, seconds]) => ({ name, seconds }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 8);

    const totalSeconds = totalActive + totalIdle;
    const activePercentage = totalSeconds > 0 ? Math.round((totalActive / totalSeconds) * 100) : 0;

    return {
      totalActiveSeconds: totalActive,
      totalIdleSeconds: totalIdle,
      activePercentage,
      topApplications,
    };
  }
}
