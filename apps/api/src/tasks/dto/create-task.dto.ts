import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TaskPriority, TaskStatus } from '@pulsetime/types';

export class CreateTaskDto {
  @ApiProperty({ example: 'UUID' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ example: 'Build multi-tenant authentication middleware' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Implement TenantContext and JWT bearer strategy' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus = TaskStatus.TODO;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  assignedEmployeeId?: string;

  @ApiPropertyOptional({ example: 240 })
  @IsOptional()
  @IsInt()
  estimatedMinutes?: number;

  @ApiPropertyOptional({ example: '2026-10-15T00:00:00Z' })
  @IsOptional()
  dueDate?: string;
}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus, example: TaskStatus.IN_PROGRESS })
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
