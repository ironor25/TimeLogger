import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'EMP-025' })
  @IsString()
  @IsNotEmpty()
  employeeCode: string;

  @ApiProperty({ example: 'jason.bourne@acme.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Jason' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Bourne' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '+1-555-0199' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ example: 'EMPLOYEE' })
  @IsOptional()
  @IsString()
  roleName?: string = 'EMPLOYEE';

  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  workScheduleId?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  timezone?: string = 'Asia/Kolkata';

  @ApiPropertyOptional({ example: 'TemporaryPassword123!' })
  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'Jason' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Bourne' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+1-555-0199' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}
