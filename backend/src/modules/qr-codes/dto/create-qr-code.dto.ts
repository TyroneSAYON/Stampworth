import { IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class CreateQRCodeDto {
  @IsNotEmpty()
  @IsUUID()
  businessId: string;

  @IsNotEmpty()
  codeValue: string;

  @IsOptional()
  codeImageUrl?: string;
}
