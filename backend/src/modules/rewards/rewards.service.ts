import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabase } from '@/config/supabase.config';

@Injectable()
export class RewardsService {
  async redeemReward(loyaltyCardId: string, businessId: string, userId: string, stampsUsed: number) {
    try {
      // Generate reward code
      const rewardCode = `REWARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create redeemed reward record
      const { data, error } = await supabase
        .from('redeemed_rewards')
        .insert({
          loyalty_card_id: loyaltyCardId,
          business_id: businessId,
          user_id: userId,
          stamps_used: stampsUsed,
          reward_code: rewardCode,
          is_used: false,
          redeemed_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException(error.message);
      }

      // Create transaction record
      await supabase.from('transactions').insert({
        loyalty_card_id: loyaltyCardId,
        business_id: businessId,
        user_id: userId,
        transaction_type: 'reward_redeemed',
        stamp_count: -stampsUsed,
      });

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getUserRewards(userId: string) {
    try {
      const { data, error } = await supabase
        .from('redeemed_rewards')
        .select('*, businesses(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async getBusinessRewards(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('redeemed_rewards')
        .select('*, users(full_name, email)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async validateRewardCode(rewardCode: string) {
    try {
      const { data, error } = await supabase
        .from('redeemed_rewards')
        .select('*')
        .eq('reward_code', rewardCode)
        .eq('is_used', false)
        .single();

      if (error || !data) {
        throw new NotFoundException('Invalid or already used reward code');
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async useRewardCode(rewardCode: string) {
    try {
      const { data, error } = await supabase
        .from('redeemed_rewards')
        .update({ is_used: true })
        .eq('reward_code', rewardCode)
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
}
