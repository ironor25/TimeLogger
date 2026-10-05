import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScreenshotsService } from './screenshots.service';
import { QueryScreenshotDto } from './dto/query-screenshot.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('screenshots')
@ApiBearerAuth()
@Controller('screenshots')
export class ScreenshotsController {
  constructor(private readonly screenshotsService: ScreenshotsService) {}

  @Get()
  @RequirePermissions('screenshots.view')
  @ApiOperation({ summary: 'List paginated screenshots with employee and project filters' })
  async findAll(
    @CurrentTenant() orgId: string,
    @Query() query: QueryScreenshotDto,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.screenshotsService.findAll(orgId, query, role, employeeId);
  }

  @Get(':id')
  @RequirePermissions('screenshots.view')
  @ApiOperation({ summary: 'Get single screenshot details and full resolution image' })
  async findOne(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.screenshotsService.findOne(orgId, id, role, employeeId);
  }

  @Delete(':id')
  @RequirePermissions('screenshots.delete')
  @ApiOperation({ summary: 'Admin / Owner / Self: Soft delete screenshot' })
  async remove(
    @CurrentTenant() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('employeeId') employeeId: string,
  ) {
    return this.screenshotsService.delete(orgId, id, userId, role, employeeId);
  }
}

