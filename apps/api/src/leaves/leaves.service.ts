import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyLeaveDto, RejectLeaveDto } from './dto/apply-leave.dto';
import { LeaveStatus, AttendanceStatus } from '@pulsetime/types';

@Injectable()
export class LeavesService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeaveTypes(organizationId: string) {
    return this.prisma.leaveType.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async getBalances(organizationId: string, employeeId?: string, year: number = new Date().getFullYear()) {
    const where: any = { organizationId, year };
    if (employeeId) where.employeeId = employeeId;

    return this.prisma.leaveBalance.findMany({
      where,
      include: {
        leaveType: true,
        employee: {
          select: { id: true, displayName: true, employeeCode: true },
        },
      },
      orderBy: { employee: { displayName: 'asc' } },
    });
  }

  async getRequests(
    organizationId: string,
    options: { status?: LeaveStatus; employeeId?: string },
  ) {
    const where: any = { organizationId };
    if (options.status) where.status = options.status;
    if (options.employeeId) where.employeeId = options.employeeId;

    return this.prisma.leaveRequest.findMany({
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
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async applyLeave(organizationId: string, employeeId: string, dto: ApplyLeaveDto) {
    const currentYear = new Date(dto.startDate).getFullYear();

    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId: dto.leaveTypeId,
          year: currentYear,
        },
      },
    });

    if (balance && balance.remainingDays < dto.daysCount) {
      throw new BadRequestException(
        `Insufficient leave balance. Remaining: ${balance.remainingDays}, Requested: ${dto.daysCount}`,
      );
    }

    return this.prisma.leaveRequest.create({
      data: {
        organizationId,
        employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        daysCount: dto.daysCount,
        reason: dto.reason,
        status: LeaveStatus.PENDING,
      },
      include: {
        leaveType: true,
      },
    });
  }

  async approveLeave(organizationId: string, requestId: string, approverEmployeeId: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, organizationId },
      include: { leaveType: true },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Cannot approve request in status ${request.status}`);
    }

    const currentYear = request.startDate.getFullYear();

    // Deduct balance
    await this.prisma.leaveBalance.updateMany({
      where: {
        organizationId,
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year: currentYear,
      },
      data: {
        usedDays: { increment: request.daysCount },
        remainingDays: { decrement: request.daysCount },
      },
    });

    // Mark attendance records as LEAVE for the days
    const start = new Date(request.startDate);
    const end = new Date(request.endDate);
    const cur = new Date(start);

    while (cur <= end) {
      const dayDate = new Date(cur);
      dayDate.setHours(0, 0, 0, 0);

      await this.prisma.attendanceRecord.upsert({
        where: {
          organizationId_employeeId_date: {
            organizationId,
            employeeId: request.employeeId,
            date: dayDate,
          },
        },
        update: { status: AttendanceStatus.LEAVE },
        create: {
          organizationId,
          employeeId: request.employeeId,
          date: dayDate,
          status: AttendanceStatus.LEAVE,
          notes: `Approved leave: ${request.leaveType.name}`,
        },
      });

      cur.setDate(cur.getDate() + 1);
    }

    return this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: LeaveStatus.APPROVED,
        approvedById: approverEmployeeId,
        actionedAt: new Date(),
      },
      include: {
        leaveType: true,
        employee: { select: { displayName: true } },
      },
    });
  }

  async rejectLeave(
    organizationId: string,
    requestId: string,
    approverEmployeeId: string,
    dto: RejectLeaveDto,
  ) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id: requestId, organizationId },
    });

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Cannot reject request in status ${request.status}`);
    }

    return this.prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: LeaveStatus.REJECTED,
        approvedById: approverEmployeeId,
        rejectionReason: dto.rejectionReason || null,
        actionedAt: new Date(),
      },
    });
  }
}
