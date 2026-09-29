import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('daily-overview')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Admin: Real-time organization Daily Overview (working, break, offline, totals)' })
  async getDailyOverview(
    @CurrentTenant() orgId: string,
    @Query('date') date?: string,
  ) {
    return this.attendanceService.getDailyOverview(orgId, date);
  }

  @Get()
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Admin: List attendance logs by date range and department' })
  async getAttendance(
    @CurrentTenant() orgId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.attendanceService.getAttendanceList(orgId, { startDate, endDate, departmentId });
  }
}
