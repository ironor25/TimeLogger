import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermissions('projects.view')
  @ApiOperation({ summary: 'List all organization projects' })
  async findAll(@CurrentTenant() orgId: string) {
    return this.projectsService.findAll(orgId);
  }

  @Get(':id')
  @RequirePermissions('projects.view')
  @ApiOperation({ summary: 'Get project details with task breakdown and assigned team' })
  async findOne(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.findOne(orgId, id);
  }

  @Post()
  @RequirePermissions('projects.create')
  @ApiOperation({ summary: 'Create new project' })
  async create(
    @CurrentTenant() orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(orgId, dto, userId);
  }

  @Put(':id')
  @RequirePermissions('projects.update')
  @ApiOperation({ summary: 'Update project details' })
  async update(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreateProjectDto>,
  ) {
    return this.projectsService.update(orgId, id, dto, userId);
  }

  @Post(':id/members')
  @RequirePermissions('projects.update')
  @ApiOperation({ summary: 'Add employee to project team' })
  async addMember(
    @CurrentTenant() orgId: string,
    @Param('id') projectId: string,
    @Body() body: { employeeId: string; role?: string },
  ) {
    return this.projectsService.addMember(orgId, projectId, body.employeeId, body.role);
  }
}

@ApiTags('agent')
@ApiBearerAuth()
@Controller('agent/projects')
export class AgentProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Desktop Agent: List available projects for time logging' })
  async findAll(@CurrentTenant() orgId: string) {
    return this.projectsService.findAll(orgId);
  }
}
