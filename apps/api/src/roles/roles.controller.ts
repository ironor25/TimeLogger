import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.view')
  @ApiOperation({ summary: 'List organization roles and assigned permissions' })
  async findAll(@CurrentTenant() orgId: string) {
    return this.rolesService.findAll(orgId);
  }

  @Get('permissions')
  @RequirePermissions('roles.view')
  @ApiOperation({ summary: 'List all available granular system permissions' })
  async getPermissions() {
    return this.rolesService.getAllPermissions();
  }

  @Post()
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Create custom organization role' })
  async create(
    @CurrentTenant() orgId: string,
    @Body() body: { name: string; permissions: string[] },
  ) {
    return this.rolesService.create(orgId, body.name, body.permissions);
  }

  @Put(':id')
  @RequirePermissions('roles.manage')
  @ApiOperation({ summary: 'Update role permissions' })
  async update(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @Body() body: { permissions: string[] },
  ) {
    return this.rolesService.update(orgId, id, body.permissions);
  }
}
