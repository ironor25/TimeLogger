import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class RequestScreenshotUploadDto {
  @ApiProperty({ example: 'UUID' })
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string = 'image/jpeg';

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;
}

export class CompleteScreenshotDto {
  @ApiProperty({ example: 'UUID' })
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ example: 'screenshots/org_123/emp_456/file.jpg' })
  @IsString()
  @IsNotEmpty()
  storageKey: string;

  @ApiProperty({ example: '2026-09-25T10:45:00.000Z' })
  @IsString()
  @IsNotEmpty()
  capturedAt: string;

  @ApiProperty({ example: 245000 })
  @IsNumber()
  fileSize: number;

  @ApiPropertyOptional({ example: 'image/jpeg' })
  @IsOptional()
  @IsString()
  mimeType?: string = 'image/jpeg';

  @ApiPropertyOptional({ example: 1920 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ example: 1080 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 85 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  activityPercentage?: number;

  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;
}
