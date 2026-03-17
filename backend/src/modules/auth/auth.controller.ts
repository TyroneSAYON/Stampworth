import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BusinessSignUpDto, BusinessSignInDto } from './dto/business-signup.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('business/signup')
  businessSignUp(@Body() signUpDto: BusinessSignUpDto) {
    return this.authService.businessSignUp(signUpDto);
  }

  @Post('business/signin')
  businessSignIn(@Body() signInDto: BusinessSignInDto) {
    return this.authService.businessSignIn(signInDto);
  }

  @Post('business/signout')
  businessSignOut() {
    return this.authService.businessSignOut();
  }
}
