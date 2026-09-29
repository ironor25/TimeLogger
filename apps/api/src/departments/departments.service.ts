import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(organizationId: string, name: string, code?: string) {
    const existing = await this.prisma.department.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Department with this name already exists');
    }

    return this.prisma.department.create({
      data: {
        organizationId,
        name,
        code,
      },
    });
  }
}
