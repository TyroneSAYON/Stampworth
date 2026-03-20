import { IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateStampDto {
  @IsNotEmpty()
  @IsUUID()
  loyaltyCardId: string;

  @IsNotEmpty()
  @IsUUID()
  merchantId: string;

  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  qrCodeId?: string;

  @IsOptional()
  notes?: string;
}
