import { IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateStampDto {
  @IsNotEmpty()
  @IsUUID()
  loyaltyCardId: string;

  @IsNotEmpty()
  @IsUUID()
  businessId: string;

  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  qrCodeId?: string;

  @IsOptional()
  notes?: string;
}
