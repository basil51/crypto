import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  signalId: string;

  @IsObject()
  channels: {
    telegram?: boolean;
    email?: boolean;
  };

  @IsOptional()
  @IsString()
  status?: string;
}

