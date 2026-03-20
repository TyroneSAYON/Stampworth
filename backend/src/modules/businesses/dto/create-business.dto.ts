import { IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateBusinessDto {
  @IsNotEmpty()
  businessName: string;

  @IsNotEmpty()
  address: string;

  @IsNotEmpty()
  city: string;

  @IsNotEmpty()
  state: string;

  @IsNotEmpty()
  country: string;

  @IsNotEmpty()
  postalCode: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  websiteUrl?: string;

  @IsOptional()
  logoUrl?: string;

  @IsNumber()
  @IsOptional()
  stampsPerRedemption?: number;

  @IsOptional()
  redemptionRewardDescription?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsNumber()
  @IsOptional()
  geofenceRadiusMeters?: number;
}

export class UpdateBusinessDto {
  @IsOptional()
  businessName?: string;

  @IsOptional()
  websiteUrl?: string;

  @IsOptional()
  phone?: string;

  @IsNumber()
  @IsOptional()
  stampsPerRedemption?: number;

  @IsOptional()
  redemptionRewardDescription?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsNumber()
  @IsOptional()
  geofenceRadiusMeters?: number;
}
