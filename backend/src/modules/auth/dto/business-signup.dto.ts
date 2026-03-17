import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

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

  phone?: string;
}

export class BusinessSignInDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
