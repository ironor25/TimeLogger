import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkScheduleDto, AssignScheduleDto } from './dto/create-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.workSchedule.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const schedule = await this.prisma.workSchedule.findFirst({
      where: { id, organizationId },
      include: {
        assignments: {
          include: {
            employee: {
              select: { id: true, displayName: true, employeeCode: true },
            },
          },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return schedule;
  }

  async create(organizationId: string, dto: CreateWorkScheduleDto) {
    if (dto.isDefault) {
      // Unmark any existing default
      await this.prisma.workSchedule.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.workSchedule.create({
      data: {
        organizationId,
        ...dto,
      },
    });
  }

  async update(organizationId: string, id: string, dto: Partial<CreateWorkScheduleDto>) {
    const existing = await this.prisma.workSchedule.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    if (dto.isDefault) {
      await this.prisma.workSchedule.updateMany({
        where: { organizationId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.workSchedule.update({
      where: { id },
      data: dto,
    });
  }

  async assignSchedule(organizationId: string, dto: AssignScheduleDto) {
    const [emp, sched] = await Promise.all([
      this.prisma.employee.findFirst({ where: { id: dto.employeeId, organizationId } }),
      this.prisma.workSchedule.findFirst({ where: { id: dto.workScheduleId, organizationId } }),
    ]);

    if (!emp) throw new NotFoundException('Employee not found');
    if (!sched) throw new NotFoundException('Work schedule not found');

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();

    // Close any previous open-ended assignment
    await this.prisma.scheduleAssignment.updateMany({
      where: {
        organizationId,
        employeeId: dto.employeeId,
        effectiveTo: null,
      },
      data: {
        effectiveTo: effectiveFrom,
      },
    });

    return this.prisma.scheduleAssignment.create({
      data: {
        organizationId,
        employeeId: dto.employeeId,
        workScheduleId: dto.workScheduleId,
        effectiveFrom,
      },
      include: {
        workSchedule: true,
        employee: {
          select: { id: true, displayName: true },
        },
      },
    });
  }

  async getEmployeeEffectiveSchedule(organizationId: string, employeeId: string, targetDate: Date = new Date()) {
    const assignment = await this.prisma.scheduleAssignment.findFirst({
      where: {
        organizationId,
        employeeId,
        effectiveFrom: { lte: targetDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: targetDate } }],
      },
      include: { workSchedule: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (assignment) {
      return assignment.workSchedule;
    }

    // Fallback to organization default schedule
    const defaultSchedule = await this.prisma.workSchedule.findFirst({
      where: { organizationId, isDefault: true },
    });

    return defaultSchedule;
  }
}
