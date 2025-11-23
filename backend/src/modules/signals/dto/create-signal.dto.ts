import { IsString, IsNotEmpty, IsNumber, IsEnum, IsDateString, IsArray, IsOptional, IsObject, Min, Max } from 'class-validator';
import { SignalType } from '@prisma/client';

export class CreateSignalDto {
  @IsString()
  @IsNotEmpty()
  tokenId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsEnum(SignalType)
  signalType: SignalType;

  @IsDateString()
  windowStart: Date;

  @IsDateString()
  windowEnd: Date;

  @IsArray()
  walletsInvolved: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

