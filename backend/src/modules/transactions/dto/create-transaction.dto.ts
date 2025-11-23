import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsObject } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @IsString()
  @IsNotEmpty()
  fromAddress: string;

  @IsString()
  @IsNotEmpty()
  toAddress: string;

  @IsString()
  @IsNotEmpty()
  tokenId: string;

  @IsNumber()
  amount: string; // Will be converted to Decimal

  @IsNumber()
  blockNumber: string; // Will be converted to BigInt

  @IsDateString()
  timestamp: Date;

  @IsOptional()
  @IsObject()
  raw?: Record<string, any>;
}

