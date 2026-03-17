import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { supabase } from '@/config/supabase.config';
import { BusinessSignUpDto, BusinessSignInDto } from './dto/business-signup.dto';

@Injectable()
export class AuthService {
  async businessSignUp(signUpDto: BusinessSignUpDto) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpDto.email,
        password: signUpDto.password,
      });

      if (authError) {
        throw new BadRequestException(authError.message);
      }

      // Create business record
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .insert({
          owner_email: signUpDto.email,
          name: signUpDto.businessName,
          address: signUpDto.address,
          city: signUpDto.city,
          state: signUpDto.state,
          country: signUpDto.country,
          postal_code: signUpDto.postalCode,
          phone_number: signUpDto.phone,
        })
        .select()
        .single();

      if (businessError) {
        throw new BadRequestException(businessError.message);
      }

      return {
        success: true,
        message: 'Business registered successfully',
        userId: authData.user?.id,
        businessId: businessData.id,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async businessSignIn(signInDto: BusinessSignInDto) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: signInDto.email,
        password: signInDto.password,
      });

      if (authError) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Get business data
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_email', signInDto.email)
        .single();

      if (businessError) {
        throw new BadRequestException('Business not found');
      }

      return {
        success: true,
        message: 'Business signed in successfully',
        token: authData.session?.access_token,
        business: businessData,
      };
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  async businessSignOut() {
    try {
      await supabase.auth.signOut();
      return {
        success: true,
        message: 'Business signed out successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
