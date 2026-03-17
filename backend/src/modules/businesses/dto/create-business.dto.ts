import { IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateBusinessDto {
  @IsNotEmpty()
  name: string;

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
  description?: string;

  @IsOptional()
  logoUrl?: string;

  @IsNumber()
  @IsOptional()
  stampsPerReward?: number;

  @IsOptional()
  rewardDescription?: string;

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
  name?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  phone?: string;

  @IsNumber()
  @IsOptional()
  stampsPerReward?: number;

  @IsOptional()
  rewardDescription?: string;

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
