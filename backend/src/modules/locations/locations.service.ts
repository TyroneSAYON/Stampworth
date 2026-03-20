import { Injectable, BadRequestException } from '@nestjs/common';
import { supabaseAdmin } from '@/config/supabase.config';

@Injectable()
export class LocationsService {
  async findNearbyStores(latitude: number, longitude: number, maxDistance: number = 5000) {
    try {
      const { data, error } = await supabaseAdmin.rpc('find_nearby_merchants', {
        customer_lat: latitude,
        customer_lon: longitude,
        max_distance_meters: maxDistance,
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findNearbyUsers(merchantId: string, maxDistance: number = 1000) {
    try {
      const { data, error } = await supabaseAdmin.rpc('find_nearby_customers', {
        merchant_id_param: merchantId,
        max_distance_meters: maxDistance,
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async checkGeofence(customerId: string, merchantId: string) {
    try {
      const { data, error } = await supabaseAdmin.rpc('is_customer_in_geofence', {
        customer_id_param: customerId,
        merchant_id_param: merchantId,
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return { inGeofence: data };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updateUserLocation(customerId: string, latitude: number, longitude: number, accuracy?: number) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_locations')
        .insert({
          customer_id: customerId,
          latitude,
          longitude,
          accuracy_meters: accuracy,
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

  async getStoreVisits(merchantId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('store_visits')
        .select('*, customers(full_name, email, username)')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createStoreVisit(customerId: string, merchantId: string, latitude: number, longitude: number) {
    try {
      const { data, error } = await supabaseAdmin
        .from('store_visits')
        .insert({
          customer_id: customerId,
          merchant_id: merchantId,
          visit_latitude: latitude,
          visit_longitude: longitude,
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
}
