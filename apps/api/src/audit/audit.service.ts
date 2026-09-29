import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, pagination: PaginationDto, entityType?: string) {
    const { page = 1, limit = 25 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (entityType) where.entityType = entityType;

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          actorUser: {
            select: { id: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
