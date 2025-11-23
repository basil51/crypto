import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  tracked?: boolean;
}

