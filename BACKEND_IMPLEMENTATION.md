# Backend Implementation Guide - NestJS Modules

Complete implementation guide for separating customer and business pathways in the backend.

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── supabase.config.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── dto/
│   │   │       ├── customer-signup.dto.ts
│   │   │       ├── customer-signin.dto.ts
│   │   │       ├── merchant-signup.dto.ts
│   │   │       └── merchant-signin.dto.ts
│   │   ├── customers/
│   │   │   ├── customers.module.ts
│   │   │   ├── customers.controller.ts
│   │   │   └── customers.service.ts
│   │   ├── merchants/
│   │   │   ├── merchants.module.ts
│   │   │   ├── merchants.controller.ts
│   │   │   └── merchants.service.ts
│   │   ├── loyalty-cards/
│   │   │   └── (same structure)
│   │   ├── stamps/
│   │   │   └── (same structure)
│   │   ├── scanner/
│   │   │   ├── scanner.module.ts
│   │   │   ├── scanner.controller.ts
│   │   │   └── scanner.service.ts
│   │   ├── stamp-settings/
│   │   │   ├── stamp-settings.module.ts
│   │   │   ├── stamp-settings.controller.ts
│   │   │   └── stamp-settings.service.ts
│   │   ├── transactions/
│   │   └── rewards/
│   ├── app.module.ts
│   └── main.ts
```

---

## 1. DTOs (Data Transfer Objects)

### `src/modules/auth/dto/customer-signup.dto.ts`
```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CustomerSignUpDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsString()
  phoneNumber?: string;
}
```

### `src/modules/auth/dto/customer-signin.dto.ts`
```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CustomerSignInDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
```

### `src/modules/auth/dto/merchant-signup.dto.ts`
```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength, IsNumber, IsOptional } from 'class-validator';

export class MerchantSignUpDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  @IsString()
  businessName: string;

  @IsString()
  address?: string;

  @IsString()
  city?: string;

  @IsString()
  state?: string;

  @IsString()
  postalCode?: string;

  @IsString()
  country?: string;

  @IsNumber()
  latitude?: number;

  @IsNumber()
  longitude?: number;

  @IsString()
  phone?: string;
}
```

### `src/modules/auth/dto/merchant-signin.dto.ts`
```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class MerchantSignInDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
```

---

## 2. Auth Service

### `src/modules/auth/auth.service.ts`
```typescript
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { supabase, supabaseAdmin } from '@/config/supabase.config';
import { JwtService } from '@nestjs/jwt';
import { CustomerSignUpDto, CustomerSignInDto } from './dto/customer-signup.dto';
import { MerchantSignUpDto, MerchantSignInDto } from './dto/merchant-signup.dto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // ========== CUSTOMER SIGNUP ==========
  async customerSignUp(signUpDto: CustomerSignUpDto) {
    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('customers')
        .select('id')
        .eq('username', signUpDto.username)
        .single();

      if (existingUser) {
        throw new ConflictException('Username already taken');
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpDto.email,
        password: signUpDto.password,
      });

      if (authError) {
        throw new BadRequestException(authError.message);
      }

      // Create customer profile
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert({
          auth_id: authData.user?.id,
          email: signUpDto.email,
          username: signUpDto.username,
          full_name: signUpDto.fullName,
          phone_number: signUpDto.phoneNumber,
        })
        .select()
        .single();

      if (customerError) {
        throw new BadRequestException(customerError.message);
      }

      // Generate customer QR code
      const qrCodeValue = `CUSTOMER_${customerData.id}_${Date.now()}`;
      const { data: qrData, error: qrError } = await supabase
        .from('customer_qr_codes')
        .insert({
          customer_id: customerData.id,
          qr_code_value: qrCodeValue,
        })
        .select()
        .single();

      if (qrError) {
        console.error('QR code generation failed:', qrError);
      }

      return {
        success: true,
        message: 'Customer registered successfully',
        customerId: customerData.id,
        email: customerData.email,
        username: customerData.username,
        qrCode: qrData,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // ========== CUSTOMER SIGNIN ==========
  async customerSignIn(signInDto: CustomerSignInDto) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: signInDto.email,
        password: signInDto.password,
      });

      if (authError) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Get customer data
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('auth_id', authData.user?.id)
        .single();

      if (customerError) {
        throw new BadRequestException('Customer profile not found');
      }

      // Get customer QR code
      const { data: qrCodeData } = await supabase
        .from('customer_qr_codes')
        .select('*')
        .eq('customer_id', customerData.id)
        .eq('is_active', true)
        .single();

      return {
        success: true,
        message: 'Customer signed in successfully',
        token: authData.session?.access_token,
        customer: {
          id: customerData.id,
          email: customerData.email,
          username: customerData.username,
          fullName: customerData.full_name,
          qrCode: qrCodeData,
        },
      };
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  // ========== MERCHANT SIGNUP ==========
  async merchantSignUp(signUpDto: MerchantSignUpDto) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpDto.email,
        password: signUpDto.password,
      });

      if (authError) {
        throw new BadRequestException(authError.message);
      }

      // Create merchant profile
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .insert({
          auth_id: authData.user?.id,
          owner_email: signUpDto.email,
          business_name: signUpDto.businessName,
          address: signUpDto.address,
          city: signUpDto.city,
          state: signUpDto.state,
          postal_code: signUpDto.postalCode,
          country: signUpDto.country,
          latitude: signUpDto.latitude,
          longitude: signUpDto.longitude,
          phone_number: signUpDto.phone,
        })
        .select()
        .single();

      if (merchantError) {
        throw new BadRequestException(merchantError.message);
      }

      // Create default stamp settings
      const { error: settingsError } = await supabase
        .from('stamp_settings')
        .insert({
          merchant_id: merchantData.id,
          stamps_per_redemption: 10,
          redemption_reward_description: 'Get a free reward!',
          stamp_color: '#FF6B6B',
        });

      if (settingsError) {
        console.error('Stamp settings creation failed:', settingsError);
      }

      return {
        success: true,
        message: 'Merchant registered successfully',
        merchantId: merchantData.id,
        email: merchantData.owner_email,
        businessName: merchantData.business_name,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // ========== MERCHANT SIGNIN ==========
  async merchantSignIn(signInDto: MerchantSignInDto) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: signInDto.email,
        password: signInDto.password,
      });

      if (authError) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Get merchant data
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('auth_id', authData.user?.id)
        .single();

      if (merchantError) {
        throw new BadRequestException('Merchant profile not found');
      }

      // Get stamp settings
      const { data: stampSettings } = await supabase
        .from('stamp_settings')
        .select('*')
        .eq('merchant_id', merchantData.id)
        .single();

      return {
        success: true,
        message: 'Merchant signed in successfully',
        token: authData.session?.access_token,
        merchant: {
          id: merchantData.id,
          email: merchantData.owner_email,
          businessName: merchantData.business_name,
          latitude: merchantData.latitude,
          longitude: merchantData.longitude,
          stampSettings,
        },
      };
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }

  // ========== SIGNOUT ==========
  async signOut() {
    try {
      await supabase.auth.signOut();
      return {
        success: true,
        message: 'Signed out successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
```

### `src/modules/auth/auth.controller.ts`
```typescript
import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CustomerSignUpDto, CustomerSignInDto } from './dto/customer-signup.dto';
import { MerchantSignUpDto, MerchantSignInDto } from './dto/merchant-signup.dto';
import { JwtGuard } from './jwt.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ========== CUSTOMER ROUTES ==========
  @Post('customer/signup')
  customerSignUp(@Body() signUpDto: CustomerSignUpDto) {
    return this.authService.customerSignUp(signUpDto);
  }

  @Post('customer/signin')
  customerSignIn(@Body() signInDto: CustomerSignInDto) {
    return this.authService.customerSignIn(signInDto);
  }

  // ========== MERCHANT ROUTES ==========
  @Post('merchant/signup')
  merchantSignUp(@Body() signUpDto: MerchantSignUpDto) {
    return this.authService.merchantSignUp(signUpDto);
  }

  @Post('merchant/signin')
  merchantSignIn(@Body() signInDto: MerchantSignInDto) {
    return this.authService.merchantSignIn(signInDto);
  }

  // ========== SIGNOUT ==========
  @Post('signout')
  @UseGuards(JwtGuard)
  signOut() {
    return this.authService.signOut();
  }
}
```

---

## 3. Scanner Service (Core Business Logic)

### `src/modules/scanner/scanner.service.ts`
```typescript
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { supabase } from '@/config/supabase.config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ScannerService {
  // ========== RESOLVE QR CODE ==========
  // Scan customer QR code and return their card for this merchant
  async resolveQRCode(qrCodeValue: string, merchantId: string) {
    try {
      // Validate QR code
      const { data: customerQR, error: qrError } = await supabase
        .from('customer_qr_codes')
        .select('*, customers(*)')
        .eq('qr_code_value', qrCodeValue)
        .eq('is_active', true)
        .single();

      if (qrError || !customerQR) {
        throw new NotFoundException('Invalid QR code');
      }

      const customerId = customerQR.customer_id;

      // Check if loyalty card exists for this customer & merchant
      let { data: loyaltyCard, error: cardError } = await supabase
        .from('loyalty_cards')
        .select('*, stamp_settings(*)')
        .eq('customer_id', customerId)
        .eq('merchant_id', merchantId)
        .single();

      // If card doesn't exist, create it
      if (cardError && cardError.code === 'PGRST116') {
        // No card found, create one
        const { data: newCard, error: createError } = await supabase
          .from('loyalty_cards')
          .insert({
            customer_id: customerId,
            merchant_id: merchantId,
            stamp_count: 0,
            status: 'ACTIVE',
          })
          .select()
          .single();

        if (createError) {
          throw new BadRequestException('Failed to create loyalty card');
        }

        loyaltyCard = newCard;
      } else if (cardError) {
        throw new BadRequestException(cardError.message);
      }

      // Get stamp settings
      const { data: stampSettings } = await supabase
        .from('stamp_settings')
        .select('*')
        .eq('merchant_id', merchantId)
        .single();

      return {
        success: true,
        loyaltyCard,
        customer: {
          id: customerId,
          email: customerQR.customers.email,
          fullName: customerQR.customers.full_name,
          username: customerQR.customers.username,
        },
        stampSettings,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // ========== ADD STAMP ==========
  async addStamp(
    loyaltyCardId: string,
    customerId: string,
    merchantId: string,
    quantity: number = 1,
    notes?: string,
  ) {
    try {
      // Get current card state
      const { data: card, error: cardError } = await supabase
        .from('loyalty_cards')
        .select('*')
        .eq('id', loyaltyCardId)
        .single();

      if (cardError) {
        throw new NotFoundException('Card not found');
      }

      // Get stamp settings
      const { data: settings, error: settingsError } = await supabase
        .from('stamp_settings')
        .select('stamps_per_redemption')
        .eq('merchant_id', merchantId)
        .single();

      if (settingsError) {
        throw new BadRequestException('Stamp settings not found');
      }

      const newStampCount = card.stamp_count + quantity;
      const shouldRedeem = newStampCount >= settings.stamps_per_redemption;

      // Update loyalty card
      const updateData: any = {
        stamp_count: newStampCount,
        total_stamps_earned: card.total_stamps_earned + quantity,
        updated_at: new Date().toISOString(),
      };

      if (shouldRedeem) {
        updateData.is_free_redemption = true;
        updateData.status = 'FREE_REDEMPTION';
      }

      const { data: updatedCard, error: updateError } = await supabase
        .from('loyalty_cards')
        .update(updateData)
        .eq('id', loyaltyCardId)
        .select()
        .single();

      if (updateError) {
        throw new BadRequestException(updateError.message);
      }

      // Insert stamp records (quantity times)
      const stampRecords = Array.from({ length: quantity }, () => ({
        loyalty_card_id: loyaltyCardId,
        merchant_id: merchantId,
        customer_id: customerId,
        earned_date: new Date().toISOString(),
      }));

      await supabase.from('stamps').insert(stampRecords);

      // Create transaction record
      await supabase.from('transactions').insert({
        merchant_id: merchantId,
        customer_id: customerId,
        loyalty_card_id: loyaltyCardId,
        transaction_type: 'STAMP_EARNED',
        stamp_count_after: newStampCount,
        notes,
      });

      // If reached redemption, create reward code
      let rewardCode = null;
      if (shouldRedeem) {
        rewardCode = `REWARD_${uuidv4().substring(0, 8).toUpperCase()}`;
        await supabase.from('redeemed_rewards').insert({
          loyalty_card_id: loyaltyCardId,
          merchant_id: merchantId,
          customer_id: customerId,
          stamps_used: settings.stamps_per_redemption,
          reward_code: rewardCode,
          is_used: false,
        });
      }

      return {
        success: true,
        message: `Added ${quantity} stamp(s)`,
        card: updatedCard,
        rewardCode,
        isRedemptionReached: shouldRedeem,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // ========== REMOVE STAMP ==========
  async removeStamp(
    loyaltyCardId: string,
    customerId: string,
    merchantId: string,
    quantity: number = 1,
    notes?: string,
  ) {
    try {
      // Get current card state
      const { data: card, error: cardError } = await supabase
        .from('loyalty_cards')
        .select('*')
        .eq('id', loyaltyCardId)
        .single();

      if (cardError) {
        throw new NotFoundException('Card not found');
      }

      const newStampCount = Math.max(0, card.stamp_count - quantity);

      // Update loyalty card
      const updateData: any = {
        stamp_count: newStampCount,
        updated_at: new Date().toISOString(),
      };

      // Reset redemption if stamps fall below threshold
      if (card.is_free_redemption && newStampCount < 10) {
        updateData.is_free_redemption = false;
        updateData.status = 'ACTIVE';
      }

      const { data: updatedCard, error: updateError } = await supabase
        .from('loyalty_cards')
        .update(updateData)
        .eq('id', loyaltyCardId)
        .select()
        .single();

      if (updateError) {
        throw new BadRequestException(updateError.message);
      }

      // Mark stamps as invalid (FIFO - newest stamps removed first)
      const { data: stamps, error: stampsError } = await supabase
        .from('stamps')
        .select('id')
        .eq('loyalty_card_id', loyaltyCardId)
        .eq('is_valid', true)
        .order('earned_date', { ascending: false })
        .limit(quantity);

      if (!stampsError && stamps) {
        const stampIds = stamps.map((s) => s.id);
        await supabase
          .from('stamps')
          .update({ is_valid: false })
          .in('id', stampIds);
      }

      // Create transaction record
      await supabase.from('transactions').insert({
        merchant_id: merchantId,
        customer_id: customerId,
        loyalty_card_id: loyaltyCardId,
        transaction_type: 'STAMP_REMOVED',
        stamp_count_after: newStampCount,
        notes,
      });

      return {
        success: true,
        message: `Removed ${quantity} stamp(s)`,
        card: updatedCard,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // ========== PROCESS REDEMPTION ==========
  async processRedemption(loyaltyCardId: string, customerId: string, rewardCode: string) {
    try {
      // Get reward record
      const { data: reward, error: rewardError } = await supabase
        .from('redeemed_rewards')
        .select('*')
        .eq('reward_code', rewardCode)
        .eq('loyalty_card_id', loyaltyCardId)
        .single();

      if (rewardError || !reward) {
        throw new NotFoundException('Invalid reward code');
      }

      if (reward.is_used) {
        throw new BadRequestException('Reward has already been used');
      }

      // Update reward to used
      await supabase
        .from('redeemed_rewards')
        .update({
          is_used: true,
          used_at: new Date().toISOString(),
        })
        .eq('id', reward.id);

      // Update loyalty card
      const { data: updatedCard, error: cardError } = await supabase
        .from('loyalty_cards')
        .update({
          stamp_count: 0,
          status: 'REDEEMED',
          is_free_redemption: false,
          redeemed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', loyaltyCardId)
        .select()
        .single();

      if (cardError) {
        throw new BadRequestException(cardError.message);
      }

      // Create transaction
      await supabase.from('transactions').insert({
        merchant_id: reward.merchant_id,
        customer_id: customerId,
        loyalty_card_id: loyaltyCardId,
        transaction_type: 'REDEEMED',
        stamp_count_after: 0,
        notes: `Reward redeemed: ${rewardCode}`,
      });

      return {
        success: true,
        message: 'Reward successfully redeemed',
        card: updatedCard,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
```

### `src/modules/scanner/scanner.controller.ts`
```typescript
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Param,
  Get,
  Query,
} from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentMerchant } from '../common/decorators/current-merchant.decorator';

@Controller('api/scanner')
@UseGuards(JwtGuard)
export class ScannerController {
  constructor(private scannerService: ScannerService) {}

  @Post('resolve')
  async resolveQRCode(
    @Body('qrCodeValue') qrCodeValue: string,
    @CurrentMerchant() merchant: any,
  ) {
    return this.scannerService.resolveQRCode(qrCodeValue, merchant.id);
  }

  @Post('add-stamp')
  async addStamp(
    @Body() body: {
      loyaltyCardId: string;
      customerId: string;
      quantity?: number;
      notes?: string;
    },
    @CurrentMerchant() merchant: any,
  ) {
    return this.scannerService.addStamp(
      body.loyaltyCardId,
      body.customerId,
      merchant.id,
      body.quantity,
      body.notes,
    );
  }

  @Post('remove-stamp')
  async removeStamp(
    @Body() body: {
      loyaltyCardId: string;
      customerId: string;
      quantity?: number;
      notes?: string;
    },
    @CurrentMerchant() merchant: any,
  ) {
    return this.scannerService.removeStamp(
      body.loyaltyCardId,
      body.customerId,
      merchant.id,
      body.quantity,
      body.notes,
    );
  }

  @Post('redeem')
  async processRedemption(
    @Body() body: {
      loyaltyCardId: string;
      customerId: string;
      rewardCode: string;
    },
  ) {
    return this.scannerService.processRedemption(
      body.loyaltyCardId,
      body.customerId,
      body.rewardCode,
    );
  }
}
```

---

## 4. Update App Module

### `src/app.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { LoyaltyCardsModule } from './modules/loyalty-cards/loyalty-cards.module';
import { StampsModule } from './modules/stamps/stamps.module';
import { ScannerModule } from './modules/scanner/scanner.module';
import { StampSettingsModule } from './modules/stamp-settings/stamp-settings.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { LocationsModule } from './modules/locations/locations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    AuthModule,
    CustomersModule,
    MerchantsModule,
    LoyaltyCardsModule,
    StampsModule,
    ScannerModule,
    StampSettingsModule,
    TransactionsModule,
    RewardsModule,
    LocationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## Implementation Checklist

- [ ] Create all auth DTOs
- [ ] Implement AuthService with customer & merchant flows
- [ ] Implement AuthController with routes
- [ ] Create JWT strategy and guard
- [ ] Implement ScannerService with all operations
- [ ] Implement ScannerController
- [ ] Create CurrentMerchant and CurrentCustomer decorators
- [ ] Update all modules in app.module.ts
- [ ] Test all auth flows
- [ ] Test scanner operations
- [ ] Test stamp add/remove operations
- [ ] Test redemption flow

