import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TimeApprovalStatus } from '@pulsetime/types';

export class CreateManualTimeDto {
  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({ example: '2026-09-24T00:00:00Z' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: '2026-09-24T14:00:00Z' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '2026-09-24T16:30:00Z' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ example: 'Client on-site meeting and system demo' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RejectTimeEntryDto {
  @ApiPropertyOptional({ example: 'Overlaps with scheduled leave' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
