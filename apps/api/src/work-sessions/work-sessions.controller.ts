import { Controller, Get, Delete, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkSessionsService } from './work-sessions.service';
import { QuerySessionDto } from './dto/query-session.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('work-sessions')
@ApiBearerAuth()
@Controller('work-sessions')
export class WorkSessionsController {
  constructor(private readonly sessionsService: WorkSessionsService) {}

  @Get()
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'List work sessions with filters and pagination' })
  async findAll(
    @CurrentTenant() orgId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
    @Query() query: QuerySessionDto,
  ) {
    return this.sessionsService.findAll(orgId, query, role, employeeId);
  }

  @Get(':id')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Get detailed session with breaks, heartbeats, and screenshots' })
  async findOne(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.sessionsService.findOne(orgId, id, role, employeeId);
  }

  @Delete(':id')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Delete work session' })
  async deleteSession(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.sessionsService.deleteSession(orgId, id, role, employeeId);
  }

  @Patch(':id/notes')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Update work session notes' })
  async updateNotes(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @Body('notes') notes: string,
  ) {
    return this.sessionsService.updateNotes(orgId, id, notes);
  }
}

