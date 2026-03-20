import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabaseAdmin } from '@/config/supabase.config';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/create-business.dto';

@Injectable()
export class BusinessesService {
  async getBusinessById(businessId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('merchants')
        .select('*, stamp_settings(*)')
        .eq('id', businessId)
        .single();

      if (error) {
        throw new NotFoundException('Business not found');
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getBusinessByEmail(email: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('merchants')
        .select('*, stamp_settings(*)')
        .eq('owner_email', email)
        .single();

      if (error) {
        throw new NotFoundException('Business not found');
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updateBusiness(businessId: string, updateDto: UpdateBusinessDto) {
    try {
      const updatePayload = {
        business_name: updateDto.businessName,
        address: updateDto.address,
        city: updateDto.city,
        state: updateDto.state,
        country: updateDto.country,
        postal_code: updateDto.postalCode,
        phone_number: updateDto.phone,
        logo_url: updateDto.logoUrl,
        latitude: updateDto.latitude,
        longitude: updateDto.longitude,
        geofence_radius_meters: updateDto.geofenceRadiusMeters,
        website_url: updateDto.websiteUrl,
      };

      const { data, error } = await supabaseAdmin
        .from('merchants')
        .update(updatePayload)
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getAllBusinesses() {
    try {
      const { data, error } = await supabaseAdmin
        .from('merchants')
        .select('*')
        .eq('is_active', true);

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getBusinessStats(businessId: string) {
    try {
      const { count: totalStampsDistributed, error: stampsError } = await supabaseAdmin
        .from('stamps')
        .select('id', { count: 'exact' })
        .eq('merchant_id', businessId);

      const { count: totalCustomers, error: customersError } = await supabaseAdmin
        .from('loyalty_cards')
        .select('id', { count: 'exact' })
        .eq('merchant_id', businessId);

      const { count: totalTransactions, error: transactionsError } = await supabaseAdmin
        .from('transactions')
        .select('id', { count: 'exact' })
        .eq('merchant_id', businessId);

      const { count: rewardsRedeemed, error: rewardsError } = await supabaseAdmin
        .from('redeemed_rewards')
        .select('id', { count: 'exact' })
        .eq('merchant_id', businessId);

      if (stampsError || customersError || transactionsError || rewardsError) {
        throw new BadRequestException(
          stampsError?.message || customersError?.message || transactionsError?.message || rewardsError?.message,
        );
      }

      return {
        totalStampsDistributed: totalStampsDistributed || 0,
        totalCustomers: totalCustomers || 0,
        totalTransactions: totalTransactions || 0,
        rewardsRedeemed: rewardsRedeemed || 0,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async saveLoyaltyConfiguration(businessId: string, config: any) {
    try {
      const payload = {
        merchant_id: businessId,
        stamps_per_redemption: config.stampsPerRedemption,
        redemption_reward_description: config.redemptionRewardDescription,
        promotion_text: config.conditions,
        stamp_color: config.stampColor,
        card_color: config.cardColor,
        stamp_icon_name: config.stampIconName,
        stamp_icon_image_url: config.stampIconImageUrl,
      };

      const { data, error } = await supabaseAdmin
        .from('stamp_settings')
        .upsert(payload, { onConflict: 'merchant_id' })
        .select()
        .single();

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getLoyaltyConfiguration(businessId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('stamp_settings')
        .select('*')
        .eq('merchant_id', businessId)
        .single();

      if (error) {
        throw new NotFoundException('Loyalty configuration not found');
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createAnnouncement(businessId: string, message: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('merchant_announcements')
        .insert({
          merchant_id: businessId,
          message,
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getBusinessAnnouncements(businessId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('merchant_announcements')
        .select('*')
        .eq('merchant_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getCustomerAnnouncements(customerId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('merchant_announcements')
        .select('*, merchants(id, business_name, logo_url), loyalty_cards!inner(customer_id)')
        .eq('loyalty_cards.customer_id', customerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
