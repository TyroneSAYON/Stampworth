import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { supabase, supabaseAdmin } from '@/config/supabase.config';
import { BusinessSignUpDto, BusinessSignInDto } from './dto/business-signup.dto';

@Injectable()
export class AuthService {
  private deriveBusinessName(email: string, preferredBusinessName?: string) {
    if (preferredBusinessName?.trim()) {
      return preferredBusinessName.trim();
    }

    const localPart = email.split('@')[0] || 'business';
    const cleaned = localPart
      .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned ? `${cleaned} Business` : 'My Business';
  }

  async businessSignUp(signUpDto: BusinessSignUpDto) {
    try {
      const normalizedEmail = signUpDto.email.trim().toLowerCase();

      // Create auth user with immediate confirmation so credentials can sign in right away.
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: signUpDto.password,
        email_confirm: true,
        user_metadata: {
          full_name: signUpDto.ownerName,
          business_name: signUpDto.businessName,
        },
      });

      if (authError) {
        throw new BadRequestException(authError.message);
      }

      if (!authData.user?.id) {
        throw new BadRequestException('Unable to create business auth account');
      }

      // Create merchant record linked to auth user
      const { data: businessData, error: businessError } = await supabaseAdmin
        .from('merchants')
        .insert({
          auth_id: authData.user.id,
          owner_email: normalizedEmail,
          business_name: signUpDto.businessName,
          address: signUpDto.address,
          city: signUpDto.city,
          state: signUpDto.state,
          country: signUpDto.country,
          postal_code: signUpDto.postalCode,
          phone_number: signUpDto.phone,
          last_login_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (businessError) {
        throw new BadRequestException(businessError.message);
      }

      return {
        success: true,
        message: 'Business registered successfully',
        userId: authData.user.id,
        businessId: businessData.id,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async businessSignIn(signInDto: BusinessSignInDto) {
    try {
      const normalizedEmail = signInDto.email.trim().toLowerCase();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: signInDto.password,
      });

      if (authError) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Ensure merchant data exists and log successful sign-in in DB.
      const fallbackBusinessName =
        (authData.user?.user_metadata?.business_name as string | undefined) ||
        (authData.user?.user_metadata?.full_name as string | undefined) ||
        this.deriveBusinessName(normalizedEmail);

      const { data: businessData, error: businessError } = await supabaseAdmin
        .from('merchants')
        .upsert(
          {
            auth_id: authData.user?.id,
            owner_email: normalizedEmail,
            business_name: fallbackBusinessName,
            last_login_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: 'owner_email' },
        )
        .select('*')
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

  async ensureBusinessProfile(authorization: string, businessName?: string) {
    try {
      if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
        throw new UnauthorizedException('Missing bearer token');
      }

      const accessToken = authorization.slice('Bearer '.length).trim();
      if (!accessToken) {
        throw new UnauthorizedException('Missing access token');
      }

      const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.getUser(accessToken);
      if (authUserError || !authUserData.user) {
        throw new UnauthorizedException(authUserError?.message || 'Invalid auth token');
      }

      const authUser = authUserData.user;
      const ownerEmail = (authUser.email || '').toLowerCase();
      if (!ownerEmail) {
        throw new BadRequestException('Authenticated user email is required');
      }

      const resolvedBusinessName = this.deriveBusinessName(
        ownerEmail,
        businessName ||
          (authUser.user_metadata?.business_name as string | undefined) ||
          (authUser.user_metadata?.full_name as string | undefined),
      );

      const { data: existingByAuth, error: byAuthError } = await supabaseAdmin
        .from('merchants')
        .select('*')
        .eq('auth_id', authUser.id)
        .maybeSingle();

      if (byAuthError) {
        throw new BadRequestException(byAuthError.message);
      }

      if (existingByAuth) {
        return {
          success: true,
          merchant: existingByAuth,
        };
      }

      const { data: existingByEmail, error: byEmailError } = await supabaseAdmin
        .from('merchants')
        .select('*')
        .eq('owner_email', ownerEmail)
        .maybeSingle();

      if (byEmailError) {
        throw new BadRequestException(byEmailError.message);
      }

      if (existingByEmail) {
        const { data: updatedByEmail, error: updateError } = await supabaseAdmin
          .from('merchants')
          .update({
            auth_id: authUser.id,
            business_name: resolvedBusinessName || existingByEmail.business_name,
          })
          .eq('id', existingByEmail.id)
          .select('*')
          .single();

        if (updateError) {
          throw new BadRequestException(updateError.message);
        }

        return {
          success: true,
          merchant: updatedByEmail,
        };
      }

      const { data: createdMerchant, error: createError } = await supabaseAdmin
        .from('merchants')
        .insert({
          auth_id: authUser.id,
          owner_email: ownerEmail,
          business_name: resolvedBusinessName,
          address: 'To be updated',
          city: 'To be updated',
          state: 'To be updated',
          country: 'To be updated',
          postal_code: '0000',
        })
        .select('*')
        .single();

      if (createError) {
        throw new BadRequestException(createError.message);
      }

      return {
        success: true,
        merchant: createdMerchant,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(error.message || 'Unable to ensure merchant profile');
    }
  }
}
