import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async create(organizationId: string, name: string, permissionKeys: string[]) {
    const existing = await this.prisma.role.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: name.toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Role '${name}' already exists in this organization`);
    }

    const role = await this.prisma.role.create({
      data: {
        organizationId,
        name: name.toUpperCase(),
        isSystem: false,
      },
    });

    if (permissionKeys && permissionKeys.length > 0) {
      const perms = await this.prisma.permission.findMany({
        where: { key: { in: permissionKeys } },
      });

      for (const p of perms) {
        await this.prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: p.id,
          },
        });
      }
    }

    return this.prisma.role.findUnique({
      where: { id: role.id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }

  async update(organizationId: string, id: string, permissionKeys: string[]) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem && role.name === 'OWNER') {
      throw new ForbiddenException('The OWNER role permissions cannot be altered');
    }

    // Delete existing permissions and replace
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: id },
    });

    const perms = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    for (const p of perms) {
      await this.prisma.rolePermission.create({
        data: {
          roleId: id,
          permissionId: p.id,
        },
      });
    }

    return this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }
}
