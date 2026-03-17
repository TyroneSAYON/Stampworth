import { supabase } from '@/lib/supabase';

// BUSINESS APP: Get business data
export const getBusinessData = async (businessEmail: string) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_email', businessEmail)
    .single();
  return { data, error };
};

// BUSINESS APP: Add stamp for customer
export const addStampToCustomer = async (loyaltyCardId: string, businessId: string, userId: string, qrCodeId: string) => {
  const { data, error } = await supabase
    .from('stamps')
    .insert({
      loyalty_card_id: loyaltyCardId,
      business_id: businessId,
      user_id: userId,
      qr_code_id: qrCodeId,
      earned_date: new Date().toISOString(),
    });
  return { data, error };
};

// BUSINESS APP: Get nearby users
export const getNearbyUsers = async (businessId: string, maxDistance: number = 1000) => {
  const { data, error } = await supabase
    .rpc('find_nearby_users', {
      store_business_id: businessId,
      max_distance_meters: maxDistance,
    });
  return { data, error };
};

// BUSINESS APP: Get all QR codes
export const getBusinessQRCodes = async (businessId: string) => {
  const { data, error } = await supabase
    .from('qr_codes')
    .select('*')
    .eq('business_id', businessId);
  return { data, error };
};

// BUSINESS APP: Get all loyalty cards for business
export const getBusinessLoyaltyCards = async (businessId: string) => {
  const { data, error } = await supabase
    .from('loyalty_cards')
    .select('*, users(email, full_name)')
    .eq('business_id', businessId);
  return { data, error };
};

// BUSINESS APP: Get transactions history
export const getTransactionsHistory = async (businessId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, users(full_name, email)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  return { data, error };
};

// BUSINESS APP: Create QR code
export const createQRCode = async (businessId: string, codeValue: string, codeImageUrl: string) => {
  const { data, error } = await supabase
    .from('qr_codes')
    .insert({
      business_id: businessId,
      code_value: codeValue,
      code_image_url: codeImageUrl,
    });
  return { data, error };
};

// BUSINESS APP: Get store visits
export const getStoreVisits = async (businessId: string) => {
  const { data, error } = await supabase
    .from('store_visits')
    .select('*, users(full_name, email)')
    .eq('business_id', businessId)
    .order('visited_at', { ascending: false });
  return { data, error };
};
