import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryEmployeeDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by name, email, or employee code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by manager ID' })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional({ description: 'Filter by status (ACTIVE, SUSPENDED, DISABLED)' })
  @IsOptional()
  @IsString()
  status?: string;
}
