import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ActivityHeartbeatDto {
  @ApiProperty({ example: 'UUID' })
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({ example: 'UUID' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ example: '2026-09-25T10:42:00.000Z' })
  @IsString()
  @IsNotEmpty()
  capturedAt: string;

  @ApiProperty({ example: 270, description: 'Active seconds in the heartbeat window' })
  @IsInt()
  @Min(0)
  @Max(3600)
  activeSeconds: number;

  @ApiProperty({ example: 30, description: 'Idle seconds in the heartbeat window' })
  @IsInt()
  @Min(0)
  @Max(3600)
  idleSeconds: number;

  @ApiPropertyOptional({ example: 'Visual Studio Code' })
  @IsOptional()
  @IsString()
  activeApplication?: string;

  @ApiPropertyOptional({ example: 'pulsetime - workspace.ts' })
  @IsOptional()
  @IsString()
  windowTitle?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  keysPressed?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt()
  mouseClicks?: number;
}
