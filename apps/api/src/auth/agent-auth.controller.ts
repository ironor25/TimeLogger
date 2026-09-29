import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AgentLoginDto } from './dto/agent-login.dto';
import { Public } from '../common/decorators/public.decorator';
import { Request } from 'express';

@ApiTags('agent')
@Controller('agent/auth')
export class AgentAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desktop Agent employee login and device registration' })
  @ApiResponse({ status: 200, description: 'Agent authenticated, device registered, active schedule returned' })
  async agentLogin(@Body() dto: AgentLoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    console.log(`🟢 [Desktop Login] Agent login attempt for: ${dto.email} (Device: ${dto.deviceName || 'Desktop'})`);
    const result = await this.authService.agentLogin(dto, ip, userAgent);
    console.log(`✅ [Desktop Login] Login successful: ${result.employee.displayName} (${result.employee.employeeCode})`);
    return result;
  }
}
