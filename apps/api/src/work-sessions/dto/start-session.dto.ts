import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class StartSessionDto {
  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ example: 'Working on core dashboard components' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class StopSessionDto {
  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ example: 'Day completed' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class StartBreakDto {
  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ example: 'Lunch break' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EndBreakDto {
  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
