import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class EmployeeSummaryQueryDto {
  @ApiPropertyOptional({ description: 'Start date YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by Department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by specific Employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Display format: hh:mm or decimal', default: 'hh:mm' })
  @IsOptional()
  @IsString()
  format?: 'hh:mm' | 'decimal' = 'hh:mm';
}

export class TimelineQueryDto {
  @ApiPropertyOptional({ description: 'Target date YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Employee ID' })
  @IsOptional()
  @IsString()
  employeeId?: string;
}
