import { Controller, Get, Delete, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkSessionsService } from './work-sessions.service';
import { QuerySessionDto } from './dto/query-session.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('work-sessions')
@ApiBearerAuth()
@Controller('work-sessions')
export class WorkSessionsController {
  constructor(private readonly sessionsService: WorkSessionsService) {}

  @Get()
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Admin: List work sessions with filters and pagination' })
  async findAll(
    @CurrentTenant() orgId: string,
    @Query() query: QuerySessionDto,
  ) {
    return this.sessionsService.findAll(orgId, query);
  }

  @Get(':id')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Admin: Get detailed session with breaks, heartbeats, and screenshots' })
  async findOne(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
  ) {
    return this.sessionsService.findOne(orgId, id);
  }

  @Delete(':id')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Admin: Delete work session' })
  async deleteSession(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
  ) {
    return this.sessionsService.deleteSession(orgId, id);
  }

  @Patch(':id/notes')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Admin: Update work session notes' })
  async updateNotes(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @Body('notes') notes: string,
  ) {
    return this.sessionsService.updateNotes(orgId, id, notes);
  }
}
