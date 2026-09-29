import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'List all registered desktop devices across organization' })
  async findAll(@CurrentTenant() orgId: string) {
    return this.devicesService.findAll(orgId);
  }

  @Get('employee/:employeeId')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'List devices for a specific employee' })
  async findByEmployee(
    @CurrentTenant() orgId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.devicesService.findByEmployee(orgId, employeeId);
  }
}
