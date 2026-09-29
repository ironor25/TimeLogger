import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateWorkScheduleDto, AssignScheduleDto } from './dto/create-schedule.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'List all organization work schedules' })
  async findAll(@CurrentTenant() orgId: string) {
    return this.schedulesService.findAll(orgId);
  }

  @Get(':id')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get schedule details and employee assignments' })
  async findOne(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
  ) {
    return this.schedulesService.findOne(orgId, id);
  }

  @Post()
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Create a new work schedule' })
  async create(
    @CurrentTenant() orgId: string,
    @Body() dto: CreateWorkScheduleDto,
  ) {
    return this.schedulesService.create(orgId, dto);
  }

  @Put(':id')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Update work schedule configuration' })
  async update(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateWorkScheduleDto>,
  ) {
    return this.schedulesService.update(orgId, id, dto);
  }

  @Post('assign')
  @RequirePermissions('employees.update')
  @ApiOperation({ summary: 'Assign an employee to a work schedule' })
  async assign(
    @CurrentTenant() orgId: string,
    @Body() dto: AssignScheduleDto,
  ) {
    return this.schedulesService.assignSchedule(orgId, dto);
  }
}
