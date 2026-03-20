import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabaseAdmin } from '@/config/supabase.config';
import { CreateStampDto } from './dto/create-stamp.dto';

@Injectable()
export class StampsService {
  async addStamp(createStampDto: CreateStampDto) {
    try {
      // Add stamp
      const { data: stampData, error: stampError } = await supabaseAdmin
        .from('stamps')
        .insert({
          loyalty_card_id: createStampDto.loyaltyCardId,
          merchant_id: createStampDto.merchantId,
          customer_id: createStampDto.customerId,
          earned_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (stampError) {
        throw new BadRequestException(stampError.message);
      }

      // Update loyalty card stamp count after issuing a new stamp
      const { data: card, error: cardError } = await supabaseAdmin
        .from('loyalty_cards')
        .select('stamp_count, total_stamps_earned')
        .eq('id', createStampDto.loyaltyCardId)
        .single();

      if (cardError) {
        throw new BadRequestException(cardError.message);
      }

      const nextStampCount = (card?.stamp_count || 0) + 1;
      const totalEarned = (card?.total_stamps_earned || 0) + 1;

      await supabaseAdmin
        .from('loyalty_cards')
        .update({
          stamp_count: nextStampCount,
          total_stamps_earned: totalEarned,
          is_free_redemption: false,
        })
        .eq('id', createStampDto.loyaltyCardId);

      // Create transaction record
      await supabaseAdmin.from('transactions').insert({
        loyalty_card_id: createStampDto.loyaltyCardId,
        merchant_id: createStampDto.merchantId,
        customer_id: createStampDto.customerId,
        transaction_type: 'STAMP_EARNED',
        stamp_count_after: nextStampCount,
        notes: createStampDto.notes,
      });

      return stampData;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getCardStamps(loyaltyCardId: string) {
    try {
      const { data, error } = await supabaseAdmin
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
      const { data, error } = await supabaseAdmin
        .from('stamps')
        .select('*, loyalty_cards(merchants(business_name))')
        .eq('customer_id', userId)
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
      const { data, error } = await supabaseAdmin
        .from('stamps')
        .select('*, customers(full_name, email, username)')
        .eq('merchant_id', businessId)
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
