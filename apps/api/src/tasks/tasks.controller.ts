import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskStatusDto } from './dto/create-task.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermissions('tasks.view')
  @ApiOperation({ summary: 'List tasks with project and assignment filters' })
  async findAll(
    @CurrentTenant() orgId: string,
    @Query('projectId') projectId?: string,
    @Query('assignedEmployeeId') assignedEmployeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.tasksService.findAll(orgId, { projectId, assignedEmployeeId, status });
  }

  @Get(':id')
  @RequirePermissions('tasks.view')
  @ApiOperation({ summary: 'Get task details by ID' })
  async findOne(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.findOne(orgId, id);
  }

  @Post()
  @RequirePermissions('tasks.create')
  @ApiOperation({ summary: 'Create new task under a project' })
  async create(
    @CurrentTenant() orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(orgId, dto, userId);
  }

  @Put(':id')
  @RequirePermissions('tasks.update')
  @ApiOperation({ summary: 'Update task details' })
  async update(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreateTaskDto>,
  ) {
    return this.tasksService.update(orgId, id, dto, userId);
  }

  @Patch(':id/status')
  @RequirePermissions('tasks.update')
  @ApiOperation({ summary: 'Update task status' })
  async updateStatus(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(orgId, id, dto.status);
  }
}

@ApiTags('agent')
@ApiBearerAuth()
@Controller('agent/tasks')
export class AgentTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Desktop Agent: List tasks for selected project' })
  async findAll(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.tasksService.findAll(orgId, { projectId, assignedEmployeeId: employeeId });
  }
}
