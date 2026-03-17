import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { supabase } from '@/config/supabase.config';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/create-business.dto';

@Injectable()
export class BusinessesService {
  async getBusinessById(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
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
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
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
      const { data, error } = await supabase
        .from('businesses')
        .update(updateDto)
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
      const { data, error } = await supabase
        .from('businesses')
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
      // Get total stamps distributed
      const { data: stampsData, error: stampsError } = await supabase
        .from('stamps')
        .select('id', { count: 'exact' })
        .eq('business_id', businessId);

      // Get total customers
      const { data: customersData, error: customersError } = await supabase
        .from('loyalty_cards')
        .select('id', { count: 'exact' })
        .eq('business_id', businessId);

      // Get total transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id', { count: 'exact' })
        .eq('business_id', businessId);

      return {
        totalStampsDistributed: stampsData?.length || 0,
        totalCustomers: customersData?.length || 0,
        totalTransactions: transactionsData?.length || 0,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
