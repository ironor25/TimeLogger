import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@pulsetime/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET', 'pulsetime_dev_access_secret_super_secure_key_12345'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.organizationId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          where: { organizationId: payload.organizationId },
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        employees: {
          where: { organizationId: payload.organizationId },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account is suspended, disabled, or does not exist');
    }

    const orgRole = user.userRoles[0]?.role;
    const employee = user.employees[0] || null;
    const permissions = orgRole?.rolePermissions.map((rp) => rp.permission.key) || [];

    return {
      id: user.id,
      email: user.email,
      organizationId: payload.organizationId,
      role: orgRole?.name || 'EMPLOYEE',
      permissions,
      employeeId: employee?.id || null,
      employee,
    };
  }
}
