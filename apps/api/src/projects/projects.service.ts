import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, employeeId?: string) {
    const where: any = { organizationId };

    return this.prisma.project.findMany({
      where,
      include: {
        _count: {
          select: { tasks: true, members: true, workSessions: true },
        },
        members: {
          include: {
            employee: {
              select: { id: true, displayName: true, employeeCode: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        tasks: {
          include: {
            assignedEmployee: {
              select: { id: true, displayName: true, employeeCode: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        members: {
          include: {
            employee: {
              select: { id: true, displayName: true, employeeCode: true, department: true },
            },
          },
        },
        _count: {
          select: { workSessions: true, screenshots: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async create(organizationId: string, dto: CreateProjectDto, actorUserId: string) {
    const existing = await this.prisma.project.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: dto.code.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Project code '${dto.code}' already exists`);
    }

    const project = await this.prisma.project.create({
      data: {
        organizationId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description || null,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        createdById: actorUserId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'CREATE',
        entityType: 'Project',
        entityId: project.id,
        newValues: project as any,
      },
    });

    return project;
  }

  async update(
    organizationId: string,
    id: string,
    dto: Partial<CreateProjectDto>,
    actorUserId: string,
  ) {
    const existing = await this.prisma.project.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.code !== undefined) updateData.code = dto.code.toUpperCase();
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;

    const updated = await this.prisma.project.update({
      where: { id },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'UPDATE',
        entityType: 'Project',
        entityId: id,
        oldValues: existing as any,
        newValues: updated as any,
      },
    });

    return updated;
  }

  async addMember(organizationId: string, projectId: string, employeeId: string, role: string = 'MEMBER') {
    const [project, employee] = await Promise.all([
      this.prisma.project.findFirst({ where: { id: projectId, organizationId } }),
      this.prisma.employee.findFirst({ where: { id: employeeId, organizationId } }),
    ]);

    if (!project) throw new NotFoundException('Project not found');
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.projectMember.upsert({
      where: {
        projectId_employeeId: {
          projectId,
          employeeId,
        },
      },
      update: { role },
      create: {
        organizationId,
        projectId,
        employeeId,
        role,
      },
    });
  }
}
