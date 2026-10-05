import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('activity')
@ApiBearerAuth()
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('summary')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Get application usage and active/idle ratio breakdown' })
  async getSummary(
    @CurrentTenant() orgId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
    @Query('employeeId') queryEmployeeId?: string,
    @Query('date') date?: string,
  ) {
    return this.activityService.getActivitySummary(orgId, { employeeId: queryEmployeeId, date }, role, employeeId);
  }
}

