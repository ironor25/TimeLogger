import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskStatus } from '@pulsetime/types';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    organizationId: string,
    options: { projectId?: string; assignedEmployeeId?: string; status?: string },
  ) {
    const where: any = { organizationId };
    if (options.projectId) where.projectId = options.projectId;
    if (options.assignedEmployeeId) where.assignedEmployeeId = options.assignedEmployeeId;
    if (options.status) where.status = options.status;

    return this.prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, code: true },
        },
        assignedEmployee: {
          select: { id: true, displayName: true, employeeCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId },
      include: {
        project: true,
        assignedEmployee: true,
        workSessions: {
          take: 10,
          orderBy: { startedAt: 'desc' },
          include: {
            employee: { select: { displayName: true } },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async create(organizationId: string, dto: CreateTaskDto, actorUserId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId },
    });

    if (!project) {
      throw new NotFoundException('Project not found in this organization');
    }

    const task = await this.prisma.task.create({
      data: {
        organizationId,
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description || null,
        status: dto.status || TaskStatus.TODO,
        priority: dto.priority,
        assignedEmployeeId: dto.assignedEmployeeId || null,
        estimatedMinutes: dto.estimatedMinutes || null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: {
        project: true,
        assignedEmployee: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'CREATE',
        entityType: 'Task',
        entityId: task.id,
        newValues: task as any,
      },
    });

    return task;
  }

  async update(
    organizationId: string,
    id: string,
    dto: Partial<CreateTaskDto>,
    actorUserId: string,
  ) {
    const existing = await this.prisma.task.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.assignedEmployeeId !== undefined) updateData.assignedEmployeeId = dto.assignedEmployeeId;
    if (dto.estimatedMinutes !== undefined) updateData.estimatedMinutes = dto.estimatedMinutes;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const updated = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        assignedEmployee: true,
      },
    });

    return updated;
  }

  async updateStatus(organizationId: string, id: string, status: TaskStatus) {
    const existing = await this.prisma.task.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return this.prisma.task.update({
      where: { id },
      data: { status },
    });
  }
}
