import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '@/config/supabase.config';

@Injectable()
export class LocationsService {
  async findNearbyStores(latitude: number, longitude: number, maxDistance: number = 5000) {
    try {
      const { data, error } = await supabase.rpc('find_nearby_stores', {
        user_lat: latitude,
        user_lon: longitude,
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

  async findNearbyUsers(businessId: string, maxDistance: number = 1000) {
    try {
      const { data, error } = await supabase.rpc('find_nearby_users', {
        store_business_id: businessId,
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

  async checkGeofence(latitude: number, longitude: number, businessId: string) {
    try {
      const { data, error } = await supabase.rpc('is_user_in_geofence', {
        user_lat: latitude,
        user_lon: longitude,
        store_business_id: businessId,
      });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return { inGeofence: data };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updateUserLocation(userId: string, latitude: number, longitude: number, accuracy?: number) {
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .insert({
          user_id: userId,
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

  async getStoreVisits(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('store_visits')
        .select('*, users(full_name, email)')
        .eq('business_id', businessId)
        .order('visited_at', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createStoreVisit(userId: string, businessId: string, latitude: number, longitude: number) {
    try {
      const { data, error } = await supabase
        .from('store_visits')
        .insert({
          user_id: userId,
          business_id: businessId,
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
