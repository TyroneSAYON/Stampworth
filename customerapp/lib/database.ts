import { supabase } from '@/lib/supabase';

// CUSTOMER APP: Get user's loyalty cards
export const getUserLoyaltyCards = async (userId: string) => {
  const { data, error } = await supabase
    .from('loyalty_cards')
    .select('*, businesses(name, logo_url, geofence_radius_meters, latitude, longitude)')
    .eq('user_id', userId);
  return { data, error };
};

// CUSTOMER APP: Get stamps for a specific card
export const getCardStamps = async (loyaltyCardId: string) => {
  const { data, error } = await supabase
    .from('stamps')
    .select('*')
    .eq('loyalty_card_id', loyaltyCardId)
    .order('earned_date', { ascending: false });
  return { data, error };
};

// CUSTOMER APP: Find nearby stores
export const findNearbyStores = async (latitude: number, longitude: number, maxDistance: number = 5000) => {
  const { data, error } = await supabase
    .rpc('find_nearby_stores', {
      user_lat: latitude,
      user_lon: longitude,
      max_distance_meters: maxDistance,
    });
  return { data, error };
};

// CUSTOMER APP: Check if user in geofence
export const checkGeofence = async (latitude: number, longitude: number, businessId: string) => {
  const { data, error } = await supabase
    .rpc('is_user_in_geofence', {
      user_lat: latitude,
      user_lon: longitude,
      store_business_id: businessId,
    });
  return { data, error };
};

// CUSTOMER APP: Generate customer QR code
export const generateCustomerQRCode = async (userId: string, qrCodeValue: string, qrCodeImageUrl: string) => {
  const { data, error } = await supabase
    .from('customer_qr_codes')
    .insert({
      user_id: userId,
      qr_code_value: qrCodeValue,
      qr_code_image_url: qrCodeImageUrl,
    });
  return { data, error };
};

// CUSTOMER APP: Get user's QR codes
export const getUserQRCodes = async (userId: string) => {
  const { data, error } = await supabase
    .from('customer_qr_codes')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};

// CUSTOMER APP: Get user's transactions
export const getUserTransactions = async (userId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, businesses(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

// CUSTOMER APP: Get redeemed rewards
export const getRedeemedRewards = async (userId: string) => {
  const { data, error } = await supabase
    .from('redeemed_rewards')
    .select('*, businesses(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

// CUSTOMER APP: Update user location
export const updateUserLocation = async (userId: string, latitude: number, longitude: number, accuracy: number) => {
  const { data, error } = await supabase
    .from('user_locations')
    .insert({
      user_id: userId,
      latitude,
      longitude,
      accuracy_meters: accuracy,
    });
  return { data, error };
};

// CUSTOMER APP: Create store visit record
export const createStoreVisit = async (userId: string, businessId: string, latitude: number, longitude: number) => {
  const { data, error } = await supabase
    .from('store_visits')
    .insert({
      user_id: userId,
      business_id: businessId,
      visit_latitude: latitude,
      visit_longitude: longitude,
    });
  return { data, error };
};
