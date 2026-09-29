import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Admin: List audit logs with pagination and entity filter' })
  async findAll(
    @CurrentTenant() orgId: string,
    @Query() pagination: PaginationDto,
    @Query('entityType') entityType?: string,
  ) {
    return this.auditService.findAll(orgId, pagination, entityType);
  }
}
