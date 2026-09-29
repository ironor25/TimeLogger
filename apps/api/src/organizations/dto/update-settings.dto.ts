import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional({ example: 'Acme Technologies Inc.' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: '04:00' })
  @IsOptional()
  @IsString()
  dayResetTime?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  screenshotIntervalMinutes?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  idleThresholdMinutes?: number;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional()
  @IsString()
  autoPunchOutTime?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allowManualTime?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allowEmployeeEditTime?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  allowScreenshotDelete?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activityTrackingEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  screenshotTrackingEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  projectTrackingEnabled?: boolean;
}
