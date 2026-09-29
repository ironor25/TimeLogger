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

  async resetActivityData(organizationId: string, actorUserId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const [deletedBreaks, deletedActivity, deletedScreenshots, deletedSessions, deletedAttendance] =
      await this.prisma.$transaction([
        this.prisma.workSessionBreak.deleteMany({ where: { organizationId } }),
        this.prisma.activityRecord.deleteMany({ where: { organizationId } }),
        this.prisma.screenshot.deleteMany({ where: { organizationId } }),
        this.prisma.workSession.deleteMany({ where: { organizationId } }),
        this.prisma.attendanceRecord.deleteMany({ where: { organizationId } }),
      ]);

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'RESET_ACTIVITY_DATA',
        entityType: 'Organization',
        entityId: organizationId,
        newValues: {
          deletedBreaks: deletedBreaks.count,
          deletedActivity: deletedActivity.count,
          deletedScreenshots: deletedScreenshots.count,
          deletedSessions: deletedSessions.count,
          deletedAttendance: deletedAttendance.count,
        },
      },
    });

    return {
      success: true,
      message: 'All runtime activity, sessions, screenshots, and attendance reset to clean slate. Employee logins and structure preserved.',
      details: {
        deletedSessions: deletedSessions.count,
        deletedScreenshots: deletedScreenshots.count,
        deletedBreaks: deletedBreaks.count,
        deletedActivityRecords: deletedActivity.count,
        deletedAttendanceRecords: deletedAttendance.count,
      },
    };
  }
}
