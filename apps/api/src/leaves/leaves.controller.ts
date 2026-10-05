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
import { LeavesService } from './leaves.service';
import { ApplyLeaveDto, RejectLeaveDto } from './dto/apply-leave.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { LeaveStatus } from '@pulsetime/types';

@ApiTags('leaves')
@ApiBearerAuth()
@Controller('leaves')
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Get('types')
  @ApiOperation({ summary: 'List available leave policy types' })
  async getTypes(@CurrentTenant() orgId: string) {
    return this.leavesService.getLeaveTypes(orgId);
  }

  @Get('balances')
  @RequirePermissions('leaves.view')
  @ApiOperation({ summary: 'Get employee leave balance allowances' })
  async getBalances(
    @CurrentTenant() orgId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') currentEmployeeId: string,
    @Query('employeeId') employeeId?: string,
    @Query('year') year?: number,
  ) {
    const effectiveEmpId = role === 'EMPLOYEE' ? currentEmployeeId : employeeId;
    return this.leavesService.getBalances(orgId, effectiveEmpId, year);
  }

  @Get('requests')
  @RequirePermissions('leaves.view')
  @ApiOperation({ summary: 'List leave applications' })
  async getRequests(
    @CurrentTenant() orgId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') currentEmployeeId: string,
    @Query('status') status?: LeaveStatus,
    @Query('employeeId') employeeId?: string,
  ) {
    const effectiveEmpId = role === 'EMPLOYEE' ? currentEmployeeId : employeeId;
    return this.leavesService.getRequests(orgId, { status, employeeId: effectiveEmpId });
  }


  @Post('requests')
  @RequirePermissions('leaves.apply')
  @ApiOperation({ summary: 'Apply for leave' })
  async apply(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: ApplyLeaveDto,
  ) {
    if (!employeeId) {
      throw new BadRequestException('User is not associated with an employee profile');
    }
    return this.leavesService.applyLeave(orgId, employeeId, dto);
  }

  @Post('requests/:id/approve')
  @RequirePermissions('leaves.approve')
  @ApiOperation({ summary: 'Approve leave application' })
  async approve(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') approverId: string,
  ) {
    return this.leavesService.approveLeave(orgId, id, approverId);
  }

  @Post('requests/:id/reject')
  @RequirePermissions('leaves.approve')
  @ApiOperation({ summary: 'Reject leave application' })
  async reject(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('employeeId') approverId: string,
    @Body() dto: RejectLeaveDto,
  ) {
    return this.leavesService.rejectLeave(orgId, id, approverId, dto);
  }
}
