import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateLoyaltyCardDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsUUID()
  businessId: string;
}
