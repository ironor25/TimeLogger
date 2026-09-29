import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TimeEntriesService } from './time-entries.service';
import { CreateManualTimeDto, RejectTimeEntryDto } from './dto/manual-time.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TimeApprovalStatus } from '@pulsetime/types';

@ApiTags('time-entries')
@ApiBearerAuth()
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeService: TimeEntriesService) {}

  @Get()
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'List manual time entry requests' })
  async findAll(
    @CurrentTenant() orgId: string,
    @Query('status') status?: TimeApprovalStatus,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.timeService.findAll(orgId, { status, employeeId });
  }

  @Post()
  @RequirePermissions('attendance.edit')
  @ApiOperation({ summary: 'Submit manual time correction request' })
  async create(
    @CurrentTenant() orgId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: CreateManualTimeDto,
  ) {
    const targetEmployeeId = dto.employeeId || employeeId;
    if (!targetEmployeeId) {
      throw new BadRequestException('Target employee ID is required');
    }
    return this.timeService.create(orgId, targetEmployeeId, userId, dto);
  }

  @Post(':id/approve')
  @RequirePermissions('attendance.approve')
  @ApiOperation({ summary: 'Approve manual time entry and sync to timeline' })
  async approve(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.timeService.approve(orgId, id, userId);
  }

  @Post(':id/reject')
  @RequirePermissions('attendance.approve')
  @ApiOperation({ summary: 'Reject manual time entry' })
  async reject(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RejectTimeEntryDto,
  ) {
    return this.timeService.reject(orgId, id, userId, dto);
  }
}
