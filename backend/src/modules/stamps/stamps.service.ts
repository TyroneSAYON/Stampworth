import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabase } from '@/config/supabase.config';
import { CreateStampDto } from './dto/create-stamp.dto';

@Injectable()
export class StampsService {
  async addStamp(createStampDto: CreateStampDto) {
    try {
      // Add stamp
      const { data: stampData, error: stampError } = await supabase
        .from('stamps')
        .insert({
          loyalty_card_id: createStampDto.loyaltyCardId,
          business_id: createStampDto.businessId,
          user_id: createStampDto.userId,
          qr_code_id: createStampDto.qrCodeId,
          notes: createStampDto.notes,
          earned_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (stampError) {
        throw new BadRequestException(stampError.message);
      }

      // Update loyalty card stamp count
      await supabase.rpc('increment_stamp_count', {
        card_id: createStampDto.loyaltyCardId,
      });

      // Create transaction record
      await supabase.from('transactions').insert({
        loyalty_card_id: createStampDto.loyaltyCardId,
        business_id: createStampDto.businessId,
        user_id: createStampDto.userId,
        transaction_type: 'stamp_earned',
        stamp_count: 1,
        qr_code_id: createStampDto.qrCodeId,
      });

      return stampData;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getCardStamps(loyaltyCardId: string) {
    try {
      const { data, error } = await supabase
        .from('stamps')
        .select('*')
        .eq('loyalty_card_id', loyaltyCardId)
        .order('earned_date', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getUserStamps(userId: string) {
    try {
      const { data, error } = await supabase
        .from('stamps')
        .select('*, loyalty_cards(businesses(name))')
        .eq('user_id', userId)
        .order('earned_date', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getBusinessStamps(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('stamps')
        .select('*, users(full_name, email)')
        .eq('business_id', businessId)
        .order('earned_date', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
