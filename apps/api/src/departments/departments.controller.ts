import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly deptService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all organization departments' })
  async findAll(@CurrentTenant() orgId: string) {
    return this.deptService.findAll(orgId);
  }

  @Post()
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Create new department' })
  async create(
    @CurrentTenant() orgId: string,
    @Body() body: { name: string; code?: string },
  ) {
    return this.deptService.create(orgId, body.name, body.code);
  }
}
