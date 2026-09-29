import { Controller, Get, Put, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { UpdateOrganizationSettingsDto } from './dto/update-settings.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Get('settings')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get current organization configuration and settings' })
  async getSettings(@CurrentTenant() orgId: string) {
    return this.orgsService.getSettings(orgId);
  }

  @Put('settings')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Update organization settings' })
  async updateSettings(
    @CurrentTenant() orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    return this.orgsService.updateSettings(orgId, dto, userId);
  }

  @Post('reset-activity-data')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Reset all sessions, screenshots, heartbeats, and attendance to clean slate' })
  async resetActivityData(
    @CurrentTenant() orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.orgsService.resetActivityData(orgId, userId);
  }
}
