import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { ActivityHeartbeatDto } from './dto/heartbeat.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('agent')
@ApiBearerAuth()
@Controller('agent/activity')
export class AgentActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desktop Agent: Ingest periodic activity heartbeat' })
  async heartbeat(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: ActivityHeartbeatDto,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Authenticated user is not linked to an employee profile');
    }
    console.log(`💓 [Heartbeat] Employee ${employeeId} - Active: ${dto.activeSeconds}s, Idle: ${dto.idleSeconds}s (App: ${dto.activeApplication || 'N/A'})`);
    return this.activityService.ingestHeartbeat(orgId, employeeId, dto);
  }
}
