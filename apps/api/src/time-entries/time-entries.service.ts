import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManualTimeDto, RejectTimeEntryDto } from './dto/manual-time.dto';
import { TimeApprovalStatus, WorkSessionStatus } from '@pulsetime/types';

@Injectable()
export class TimeEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    options: { status?: TimeApprovalStatus; employeeId?: string },
  ) {
    const where: any = { organizationId };
    if (options.status) where.status = options.status;
    if (options.employeeId) where.employeeId = options.employeeId;

    return this.prisma.manualTimeEntry.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            displayName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    organizationId: string,
    targetEmployeeId: string,
    creatorUserId: string,
    dto: CreateManualTimeDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org?.allowManualTime) {
      throw new ForbiddenException('Organization policy does not allow manual time submissions');
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    const date = new Date(dto.date);

    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }

    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (durationSeconds > 86400) {
      throw new BadRequestException('Manual time entry cannot exceed 24 hours');
    }

    const entry = await this.prisma.manualTimeEntry.create({
      data: {
        organizationId,
        employeeId: targetEmployeeId,
        date,
        startTime: start,
        endTime: end,
        durationSeconds,
        reason: dto.reason,
        status: TimeApprovalStatus.PENDING,
        createdById: creatorUserId,
      },
      include: {
        employee: { select: { displayName: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: creatorUserId,
        action: 'CREATE',
        entityType: 'ManualTimeEntry',
        entityId: entry.id,
        newValues: entry as any,
      },
    });

    return entry;
  }

  async approve(organizationId: string, id: string, approverUserId: string) {
    const entry = await this.prisma.manualTimeEntry.findFirst({
      where: { id, organizationId },
      include: { employee: true },
    });

    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }

    if (entry.status !== TimeApprovalStatus.PENDING) {
      throw new BadRequestException(`Cannot approve entry in status ${entry.status}`);
    }

    // 1. Create a WorkSession record so all reporting and timeline engines seamlessly include it
    await this.prisma.workSession.create({
      data: {
        organizationId,
        employeeId: entry.employeeId,
        startedAt: entry.startTime,
        endedAt: entry.endTime,
        durationSeconds: entry.durationSeconds,
        status: WorkSessionStatus.COMPLETED,
        timezone: entry.employee.timezone,
        startSource: 'MANUAL',
        endSource: 'MANUAL',
        notes: `Approved manual time: ${entry.reason}`,
      },
    });

    // 2. Update daily attendance
    const dayDate = new Date(entry.date);
    dayDate.setHours(0, 0, 0, 0);

    await this.prisma.attendanceRecord.upsert({
      where: {
        organizationId_employeeId_date: {
          organizationId,
          employeeId: entry.employeeId,
          date: dayDate,
        },
      },
      update: {
        totalWorkSeconds: { increment: entry.durationSeconds },
        totalActiveSeconds: { increment: entry.durationSeconds },
        isManual: true,
      },
      create: {
        organizationId,
        employeeId: entry.employeeId,
        date: dayDate,
        status: 'PRESENT',
        totalWorkSeconds: entry.durationSeconds,
        totalActiveSeconds: entry.durationSeconds,
        isManual: true,
        notes: 'Manual time entry approved',
      },
    });

    // 3. Mark approved
    const updated = await this.prisma.manualTimeEntry.update({
      where: { id },
      data: {
        status: TimeApprovalStatus.APPROVED,
        approvedById: approverUserId,
        actionedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: approverUserId,
        action: 'APPROVE',
        entityType: 'ManualTimeEntry',
        entityId: id,
      },
    });

    return updated;
  }

  async reject(
    organizationId: string,
    id: string,
    approverUserId: string,
    dto: RejectTimeEntryDto,
  ) {
    const entry = await this.prisma.manualTimeEntry.findFirst({
      where: { id, organizationId },
    });

    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }

    if (entry.status !== TimeApprovalStatus.PENDING) {
      throw new BadRequestException(`Cannot reject entry in status ${entry.status}`);
    }

    const updated = await this.prisma.manualTimeEntry.update({
      where: { id },
      data: {
        status: TimeApprovalStatus.REJECTED,
        approvedById: approverUserId,
        rejectionReason: dto.rejectionReason || null,
        actionedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: approverUserId,
        action: 'REJECT',
        entityType: 'ManualTimeEntry',
        entityId: id,
      },
    });

    return updated;
  }
}
