import { IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateQRCodeDto {
  @IsNotEmpty()
  @IsUUID()
  merchantId: string;

  @IsNotEmpty()
  qrCodeValue: string;

  @IsOptional()
  qrCodeImageUrl?: string;
}
