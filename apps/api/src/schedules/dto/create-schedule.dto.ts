import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateWorkScheduleDto {
  @ApiProperty({ example: 'General Shift' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  timezone?: string = 'Asia/Kolkata';

  @ApiPropertyOptional({ example: '08:30' })
  @IsOptional()
  @IsString()
  punchInAllowedFrom?: string = '08:30';

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  workStarts?: string = '09:00';

  @ApiPropertyOptional({ example: '18:30' })
  @IsOptional()
  @IsString()
  workEnds?: string = '18:30';

  @ApiPropertyOptional({ example: '04:00' })
  @IsOptional()
  @IsString()
  dayResetTime?: string = '04:00';

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  screenshotIntervalMinutes?: number = 5;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  idleThresholdMinutes?: number = 5;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  autoPunchOut?: boolean = true;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional()
  @IsString()
  autoPunchOutTime?: string = '19:00';

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}

export class AssignScheduleDto {
  @ApiProperty({ example: 'UUID' })
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: 'UUID' })
  @IsString()
  @IsNotEmpty()
  workScheduleId: string;

  @ApiPropertyOptional({ example: '2026-09-25T00:00:00Z' })
  @IsOptional()
  effectiveFrom?: string;
}
