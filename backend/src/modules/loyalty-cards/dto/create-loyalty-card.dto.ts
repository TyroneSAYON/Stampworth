import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateLoyaltyCardDto {
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @IsNotEmpty()
  @IsUUID()
  merchantId: string;
}
