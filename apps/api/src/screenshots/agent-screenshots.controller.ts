import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScreenshotsService } from './screenshots.service';
import { RequestScreenshotUploadDto, CompleteScreenshotDto } from './dto/request-upload.dto';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('agent')
@ApiBearerAuth()
@Controller('agent/screenshots')
export class AgentScreenshotsController {
  constructor(private readonly screenshotsService: ScreenshotsService) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desktop Agent: Request upload URL for periodic screenshot' })
  async requestUploadUrl(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: RequestScreenshotUploadDto,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Authenticated user is not linked to an employee profile');
    }
    console.log(`📷 [Screenshot URL] Employee ${employeeId} requesting upload URL for session: ${dto.sessionId} (${dto.fileSize || 0} bytes)`);
    const res = await this.screenshotsService.requestUploadUrl(orgId, employeeId, dto);
    console.log(`🔗 [Screenshot URL] Generated upload key: ${res.storageKey}`);
    return res;
  }

  @Post('complete')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Desktop Agent: Finalize screenshot metadata after upload' })
  async complete(
    @CurrentTenant() orgId: string,
    @CurrentUser('employeeId') employeeId: string,
    @Body() dto: CompleteScreenshotDto,
  ) {
    if (!employeeId) {
      throw new BadRequestException('Authenticated user is not linked to an employee profile');
    }
    console.log(`✅ [Screenshot Complete] Employee ${employeeId} finalized screenshot: ${dto.storageKey} (Act: ${dto.activityPercentage}%)`);
    return this.screenshotsService.completeScreenshot(orgId, employeeId, dto);
  }
}
