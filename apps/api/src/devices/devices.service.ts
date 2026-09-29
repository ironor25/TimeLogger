import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.device.findMany({
      where: { organizationId },
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
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async findByEmployee(organizationId: string, employeeId: string) {
    return this.prisma.device.findMany({
      where: { organizationId, employeeId },
      orderBy: { lastSeenAt: 'desc' },
    });
  }
}
