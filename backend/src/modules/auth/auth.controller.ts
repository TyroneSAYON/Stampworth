import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BusinessSignUpDto, BusinessSignInDto, EnsureBusinessProfileDto } from './dto/business-signup.dto';

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

  @Post('business/ensure-profile')
  businessEnsureProfile(
    @Headers('authorization') authorization: string,
    @Body() payload: EnsureBusinessProfileDto,
  ) {
    return this.authService.ensureBusinessProfile(authorization, payload.businessName);
  }
}
