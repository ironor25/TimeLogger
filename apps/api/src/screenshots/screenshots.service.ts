import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { RequestScreenshotUploadDto, CompleteScreenshotDto } from './dto/request-upload.dto';
import { QueryScreenshotDto } from './dto/query-screenshot.dto';

@Injectable()
export class ScreenshotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async requestUploadUrl(
    organizationId: string,
    employeeId: string,
    dto: RequestScreenshotUploadDto,
  ) {
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

    const mimeType = dto.mimeType || 'image/jpeg';
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const storageKey = `screenshots/${organizationId}/${employeeId}/${timestamp}_${randomSuffix}.jpg`;

    const uploadInfo = await this.storageService.getUploadUrl(storageKey, mimeType);

    return uploadInfo;
  }

  async completeScreenshot(
    organizationId: string,
    employeeId: string,
    dto: CompleteScreenshotDto,
  ) {
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

    const record = await this.prisma.screenshot.create({
      data: {
        organizationId,
        employeeId,
        workSessionId: session.id,
        projectId: dto.projectId || session.projectId || null,
        taskId: dto.taskId || session.taskId || null,
        capturedAt,
        storageKey: dto.storageKey,
        mimeType: dto.mimeType || 'image/jpeg',
        fileSize: dto.fileSize,
        width: dto.width || null,
        height: dto.height || null,
        activityPercentage: dto.activityPercentage ?? null,
      },
    });

    const fileUrl = await this.storageService.getFileUrl(record.storageKey);

    return {
      ...record,
      fileUrl,
    };
  }

  async findAll(organizationId: string, query: QueryScreenshotDto) {
    const { page = 1, limit = 24, employeeId, projectId, sessionId, date } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId, isDeleted: false };

    if (employeeId) where.employeeId = employeeId;
    if (projectId) where.projectId = projectId;
    if (sessionId) where.workSessionId = sessionId;
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      where.capturedAt = { gte: startOfDay, lte: endOfDay };
    }

    const [total, items] = await Promise.all([
      this.prisma.screenshot.count({ where }),
      this.prisma.screenshot.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: {
            select: {
              id: true,
              displayName: true,
              employeeCode: true,
            },
          },
          project: {
            select: { id: true, name: true, code: true },
          },
          task: {
            select: { id: true, title: true },
          },
        },
        orderBy: { capturedAt: 'desc' },
      }),
    ]);

    const enrichedItems = await Promise.all(
      items.map(async (item) => ({
        ...item,
        fileUrl: await this.storageService.getFileUrl(item.storageKey),
      })),
    );

    return {
      data: enrichedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(organizationId: string, id: string) {
    const item = await this.prisma.screenshot.findFirst({
      where: { id, organizationId, isDeleted: false },
      include: {
        employee: {
          select: {
            id: true,
            displayName: true,
            employeeCode: true,
            email: true,
          },
        },
        project: true,
        task: true,
        workSession: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Screenshot with ID ${id} not found`);
    }

    const fileUrl = await this.storageService.getFileUrl(item.storageKey);

    return {
      ...item,
      fileUrl,
    };
  }

  async delete(organizationId: string, id: string, actorUserId: string, userRole: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org?.allowScreenshotDelete && userRole !== 'OWNER') {
      throw new ForbiddenException('Organization policy prohibits screenshot deletion');
    }

    const screenshot = await this.prisma.screenshot.findFirst({
      where: { id, organizationId, isDeleted: false },
    });

    if (!screenshot) {
      throw new NotFoundException(`Screenshot with ID ${id} not found`);
    }

    await this.prisma.screenshot.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    // Delete storage file
    await this.storageService.deleteFile(screenshot.storageKey);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: 'DELETE',
        entityType: 'Screenshot',
        entityId: id,
      },
    });

    return { message: 'Screenshot deleted successfully' };
  }
}
