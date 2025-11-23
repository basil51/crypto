import { IsString, IsNotEmpty, IsInt, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class CreateTokenDto {
  @IsString()
  @IsNotEmpty()
  chain: string;

  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  contractAddress: string;

  @IsInt()
  decimals: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

