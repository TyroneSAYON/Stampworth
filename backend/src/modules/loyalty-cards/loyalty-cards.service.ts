import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabase } from '@/config/supabase.config';
import { CreateLoyaltyCardDto } from './dto/create-loyalty-card.dto';

@Injectable()
export class LoyaltyCardsService {
  async createCard(createCardDto: CreateLoyaltyCardDto) {
    try {
      // Check if card already exists
      const { data: existingCard } = await supabase
        .from('loyalty_cards')
        .select('*')
        .eq('user_id', createCardDto.userId)
        .eq('business_id', createCardDto.businessId)
        .single();

      if (existingCard) {
        throw new BadRequestException('Card already exists for this customer and business');
      }

      const { data, error } = await supabase
        .from('loyalty_cards')
        .insert({
          user_id: createCardDto.userId,
          business_id: createCardDto.businessId,
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
      const { data, error } = await supabase
        .from('loyalty_cards')
        .select('*, businesses(name, logo_url, geofence_radius_meters, latitude, longitude)')
        .eq('user_id', userId);

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
      const { data, error } = await supabase
        .from('loyalty_cards')
        .select('*, users(full_name, email)')
        .eq('business_id', businessId);

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
      const { data, error } = await supabase
        .from('loyalty_cards')
        .select('*, businesses(*), users(*), stamps(*)')
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
