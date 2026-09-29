import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ProjectStatus } from '@pulsetime/types';

export class CreateProjectDto {
  @ApiProperty({ example: 'Cloud Infrastructure Migration' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'MIG' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ example: 'Migrating legacy servers to AWS containerized cluster' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus = ProjectStatus.ACTIVE;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00Z' })
  @IsOptional()
  endDate?: string;
}
