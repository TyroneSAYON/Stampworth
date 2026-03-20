import { Injectable, BadRequestException } from '@nestjs/common';
import { supabaseAdmin } from '@/config/supabase.config';

@Injectable()
export class TransactionsService {
  async getBusinessTransactions(businessId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*, customers(full_name, email, username)')
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

  async getUserTransactions(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*, merchants(business_name)')
        .eq('customer_id', userId)
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
      const { data, error } = await supabaseAdmin
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
