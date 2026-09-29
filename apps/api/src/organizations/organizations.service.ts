import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrganizationSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async updateSettings(
    organizationId: string,
    dto: UpdateOrganizationSettingsDto,
    userId: string,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: userId,
        action: 'UPDATE',
        entityType: 'OrganizationSettings',
        entityId: organizationId,
        oldValues: org as any,
        newValues: updated as any,
      },
    });

    return updated;
  }
}
