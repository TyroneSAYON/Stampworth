import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class BusinessSignUpDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  businessName: string;

  @IsNotEmpty()
  ownerName: string;

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
  @IsString()
  phone?: string;
}

export class BusinessSignInDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class EnsureBusinessProfileDto {
  @IsOptional()
  @IsString()
  businessName?: string;
}
