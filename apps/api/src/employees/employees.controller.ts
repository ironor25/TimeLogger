import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'List employees with pagination, search, and department filters' })
  async findAll(
    @CurrentTenant() orgId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
    @Query() query: QueryEmployeeDto,
  ) {
    return this.employeesService.findAll(orgId, query, role, employeeId);
  }

  @Get(':id')
  @RequirePermissions('employees.view')
  @ApiOperation({ summary: 'Get employee details by ID' })
  async findOne(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.employeesService.findOne(orgId, id, role, employeeId);
  }


  @Post()
  @RequirePermissions('employees.create')
  @ApiOperation({ summary: 'Create new employee, user account, and role assignment' })
  async create(
    @CurrentTenant() orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeesService.create(orgId, dto, userId);
  }

  @Put(':id')
  @RequirePermissions('employees.update')
  @ApiOperation({ summary: 'Update employee profile' })
  async update(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(orgId, id, dto, userId);
  }

  @Delete(':id')
  @RequirePermissions('employees.delete')
  @ApiOperation({ summary: 'Deactivate employee' })
  async remove(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.employeesService.remove(orgId, id, userId);
  }
}
