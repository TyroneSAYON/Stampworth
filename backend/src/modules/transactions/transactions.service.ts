import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '@/config/supabase.config';

@Injectable()
export class TransactionsService {
  async getBusinessTransactions(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
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

  async getUserTransactions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
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

  async getCardTransactions(loyaltyCardId: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('loyalty_card_id', loyaltyCardId)
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
