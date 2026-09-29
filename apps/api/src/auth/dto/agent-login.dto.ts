import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { PlatformType } from '@pulsetime/types';

export class AgentLoginDto {
  @ApiProperty({ example: 'employee@demo.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'DEV-WIN-A8F439' })
  @IsString()
  @IsNotEmpty()
  deviceIdentifier: string;

  @ApiProperty({ example: "John's ThinkPad X1" })
  @IsString()
  @IsNotEmpty()
  deviceName: string;

  @ApiProperty({ enum: PlatformType, example: PlatformType.WINDOWS })
  @IsEnum(PlatformType)
  platform: PlatformType;

  @ApiPropertyOptional({ example: 'Windows 11 Pro 23H2' })
  @IsOptional()
  @IsString()
  platformVersion?: string;

  @ApiPropertyOptional({ example: '1.4.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
