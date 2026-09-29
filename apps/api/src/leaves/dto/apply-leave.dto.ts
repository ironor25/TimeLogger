import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ApplyLeaveDto {
  @ApiProperty({ example: 'UUID' })
  @IsUUID()
  @IsNotEmpty()
  leaveTypeId: string;

  @ApiProperty({ example: '2026-10-05T00:00:00Z' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-10-07T00:00:00Z' })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(0.5)
  daysCount: number;

  @ApiProperty({ example: 'Attending family event' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RejectLeaveDto {
  @ApiPropertyOptional({ example: 'Staffing shortage during this sprint period' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
