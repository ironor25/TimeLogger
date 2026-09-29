import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkSessionsService } from './work-sessions.service';
import { StartSessionDto, StopSessionDto, StartBreakDto, EndBreakDto } from './dto/start-session.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Request } from 'express';

@ApiTags('agent')
@ApiBearerAuth()
@Controller('agent/work-sessions')
export class AgentWorkSessionsController {
  constructor(private readonly sessionsService: WorkSessionsService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desktop Agent: Start work session (Punch In)' })
  async start(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: StartSessionDto,
    @Req() req: Request,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Authenticated user is not linked to an active employee profile');
    }
    const ip = req.ip || req.socket.remoteAddress;
    console.log(`⚡ [Punch-In] Employee ${employeeId} starting work session (Project: ${dto.projectId || 'None'}, Task: ${dto.taskId || 'None'})`);
    const session = await this.sessionsService.startSession(orgId, employeeId, dto, ip);
    console.log(`✅ [Punch-In] Work session started successfully: Session ID ${session.id}`);
    return session;
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desktop Agent: Stop work session (Punch Out)' })
  async stop(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: StopSessionDto,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Authenticated user is not linked to an active employee profile');
    }
    console.log(`🛑 [Punch-Out] Employee ${employeeId} stopping work session: ${dto.sessionId}`);
    const result = await this.sessionsService.stopSession(orgId, employeeId, dto);
    console.log(`✅ [Punch-Out] Work session stopped successfully: Session ID ${dto.sessionId}`);
    return result;
  }

  @Post('break/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desktop Agent: Pause work session and start break' })
  async startBreak(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: StartBreakDto,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Authenticated user is not linked to an active employee profile');
    }
    console.log(`☕ [Break Start] Employee ${employeeId} pausing session ${dto.sessionId} for break: ${dto.reason || 'General'}`);
    const result = await this.sessionsService.startBreak(orgId, employeeId, dto);
    console.log(`✅ [Break Start] Break recorded successfully`);
    return result;
  }

  @Post('break/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desktop Agent: End break and resume work session' })
  async endBreak(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: EndBreakDto,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Authenticated user is not linked to an active employee profile');
    }
    console.log(`▶️ [Break End] Employee ${employeeId} resuming session ${dto.sessionId}`);
    const result = await this.sessionsService.endBreak(orgId, employeeId, dto);
    console.log(`✅ [Break End] Work session resumed successfully`);
    return result;
  }

  @Get('current')
  @ApiOperation({ summary: 'Desktop Agent: Get current active/paused session details' })
  async getCurrent(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Authenticated user is not linked to an active employee profile');
    }
    return this.sessionsService.getCurrentSession(orgId, employeeId);
  }

  @Get('today-summary')
  @ApiOperation({ summary: 'Desktop Agent: Get authoritative today summary and active session' })
  async getTodaySummary(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Query('date') date?: string,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Authenticated user is not linked to an active employee profile');
    }
    return this.sessionsService.getTodaySummary(orgId, employeeId, date);
  }

  @Post('sync-offline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desktop Agent: Sync an offline recorded work session' })
  async syncOffline(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: any,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Authenticated user is not linked to an active employee profile');
    }
    return this.sessionsService.syncOfflineSession(orgId, employeeId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Desktop Agent: Get employee recent work session history' })
  async getHistory(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Authenticated user is not linked to an active employee profile');
    }
    return this.sessionsService.getEmployeeHistory(orgId, employeeId);
  }
}
