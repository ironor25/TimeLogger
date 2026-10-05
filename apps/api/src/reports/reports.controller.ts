import {
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProduces } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { EmployeeSummaryQueryDto, TimelineQueryDto } from './dto/report-query.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Response } from 'express';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('employee-summary')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Get aggregated employee productivity summary with HH:MM and decimal options' })
  async getEmployeeSummary(
    @CurrentTenant() orgId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
    @Query() query: EmployeeSummaryQueryDto,
  ) {
    return this.reportsService.getEmployeeSummary(orgId, query, role, employeeId);
  }

  @Get('timeline')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Get chronological timeline segments (Active, Idle, Break, Meeting)' })
  async getTimeline(
    @CurrentTenant() orgId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
    @Query() query: TimelineQueryDto,
  ) {
    return this.reportsService.getTimeline(orgId, query, role, employeeId);
  }

  @Get('export')
  @RequirePermissions('reports.export')
  @ApiOperation({ summary: 'Export Employee Summary to Excel-compatible CSV' })
  @ApiProduces('text/csv')
  async exportCsv(
    @CurrentTenant() orgId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
    @Query() query: EmployeeSummaryQueryDto,
    @Res() res: Response,
  ) {
    const csvData = await this.reportsService.exportEmployeeSummaryCsv(orgId, query, role, employeeId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="employee-summary-${Date.now()}.csv"`);
    res.send(csvData);
  }
}

