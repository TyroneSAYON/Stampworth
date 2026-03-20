import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabaseAdmin } from '@/config/supabase.config';
import { CreateLoyaltyCardDto } from './dto/create-loyalty-card.dto';

@Injectable()
export class LoyaltyCardsService {
  async createCard(createCardDto: CreateLoyaltyCardDto) {
    try {
      // Check if card already exists
      const { data: existingCard } = await supabaseAdmin
        .from('loyalty_cards')
        .select('*')
        .eq('customer_id', createCardDto.customerId)
        .eq('merchant_id', createCardDto.merchantId)
        .single();

      if (existingCard) {
        throw new BadRequestException('Card already exists for this customer and business');
      }

      const { data, error } = await supabaseAdmin
        .from('loyalty_cards')
        .insert({
          customer_id: createCardDto.customerId,
          merchant_id: createCardDto.merchantId,
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

  async getUserCards(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('loyalty_cards')
        .select('*, merchants(business_name, logo_url, geofence_radius_meters, latitude, longitude), stamp_settings(*)')
        .eq('customer_id', userId);

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getBusinessCards(businessId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('loyalty_cards')
        .select('*, customers(full_name, email, username)')
        .eq('merchant_id', businessId);

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getCardDetail(cardId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('loyalty_cards')
        .select('*, merchants(*), customers(*), stamps(*)')
        .eq('id', cardId)
        .single();

      if (error) {
        throw new NotFoundException('Card not found');
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
