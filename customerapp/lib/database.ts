import { supabase } from '@/lib/supabase';

type CustomerProfile = {
  id: string;
  auth_id: string;
  email: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
};

export const getOrCreateCustomerProfile = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { data: null, error: userError || new Error('No authenticated user found') };
  }

  // The trigger on auth.users creates the customer row automatically.
  // Just look it up by auth_id — retry a few times to handle trigger timing.
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: existing, error: selectError } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (existing) {
      return { data: existing as CustomerProfile, error: null };
    }

    if (selectError) {
      return { data: null, error: selectError };
    }

    // Wait briefly for trigger to complete
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  // Trigger didn't create the row — create it ourselves
  const email = user.email || '';
  const metadataFullName = (user.user_metadata?.full_name as string | undefined) || null;
  const baseUsername = (email.split('@')[0] || 'customer').replace(/[^a-zA-Z0-9_]/g, '');
  const fallbackUsername = `${baseUsername || 'customer'}_${user.id.slice(0, 8)}`;

  const { data: created, error: createError } = await supabase
    .from('customers')
    .insert({
      auth_id: user.id,
      email,
      username: fallbackUsername,
      full_name: metadataFullName,
      avatar_url: user.user_metadata?.avatar_url || null,
    })
    .select('*')
    .single();

  if (createError) {
    // If insert failed due to duplicate, try one more select
    const { data: retry } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (retry) {
      return { data: retry as CustomerProfile, error: null };
    }

    return { data: null, error: createError };
  }

  return { data: created as CustomerProfile | null, error: null };
};

export const getCardStamps = async (loyaltyCardId: string) => {
  const { data, error } = await supabase
    .from('stamps')
    .select('*')
    .eq('loyalty_card_id', loyaltyCardId)
    .order('earned_date', { ascending: false });

  return { data, error };
};

export const getUserLoyaltyCards = async (customerId: string) => {
  const { data, error } = await supabase
    .from('loyalty_cards')
    .select('*, merchants(business_name, logo_url, geofence_radius_meters, latitude, longitude), stamp_settings(*)')
    .eq('customer_id', customerId);

  return { data, error };
};

export const getCustomerAnnouncements = async (customerId: string) => {
  const { data: cards, error: cardsError } = await supabase
    .from('loyalty_cards')
    .select('merchant_id')
    .eq('customer_id', customerId);

  if (cardsError) {
    return { data: null, error: cardsError };
  }

  const merchantIds = Array.from(new Set((cards || []).map((card) => card.merchant_id).filter(Boolean)));
  if (merchantIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('merchant_announcements')
    .select('id, merchant_id, message, created_at, merchants(business_name)')
    .eq('is_active', true)
    .in('merchant_id', merchantIds)
    .order('created_at', { ascending: false })
    .limit(10);

  return { data, error };
};

export const findNearbyStores = async (latitude: number, longitude: number, maxDistance: number = 5000) => {
  const { data, error } = await supabase.rpc('find_nearby_merchants', {
    customer_lat: latitude,
    customer_lon: longitude,
    max_distance_meters: maxDistance,
  });

  return { data, error };
};

// Get all active Stampworth businesses
export const getAllMerchants = async () => {
  const { data, error } = await supabase
    .from('merchants')
    .select('id, business_name, address, city, state, country, latitude, longitude, logo_url, phone_number')
    .eq('is_active', true)
    .order('business_name', { ascending: true });

  return { data: data || [], error };
};

export const getMerchantById = async (merchantId: string) => {
  const { data, error } = await supabase
    .from('merchants')
    .select('id, business_name, address, city, state, postal_code, country, latitude, longitude, logo_url')
    .eq('id', merchantId)
    .single();

  return { data, error };
};

export const checkGeofence = async (customerId: string, merchantId: string) => {
  const { data, error } = await supabase.rpc('is_customer_in_geofence', {
    customer_id_param: customerId,
    merchant_id_param: merchantId,
  });

  return { data, error };
};

const buildStableCustomerQrValue = (customerId: string) => `STAMPWORTH:${customerId}`;

export const getOrCreateCustomerQRCode = async (customerId: string) => {
  const stableQrValue = buildStableCustomerQrValue(customerId);

  const { data: existingActive, error: existingActiveError } = await supabase
    .from('customer_qr_codes')
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_active', true)
    .eq('qr_code_value', stableQrValue)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingActiveError) {
    return { data: null, error: existingActiveError };
  }

  if (existingActive) {
    return { data: existingActive, error: null };
  }

  const { data: existingRows, error: existingRowsError } = await supabase
    .from('customer_qr_codes')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (existingRowsError) {
    return { data: null, error: existingRowsError };
  }

  const existing = existingRows?.[0];

  if (existing?.id) {
    await supabase
      .from('customer_qr_codes')
      .update({ is_active: false })
      .eq('customer_id', customerId)
      .neq('id', existing.id)
      .eq('is_active', true);

    const { data: updated, error: updateError } = await supabase
      .from('customer_qr_codes')
      .update({
        qr_code_value: stableQrValue,
        is_active: true,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    return { data: updated, error: updateError };
  }

  const { data, error } = await supabase
    .from('customer_qr_codes')
    .insert({
      customer_id: customerId,
      qr_code_value: stableQrValue,
      is_active: true,
    })
    .select('*')
    .single();

  return { data, error };
};

export const rotateCustomerQRCode = async (customerId: string) => {
  // Keep backward compatibility for any old calls, but return stable QR.
  return getOrCreateCustomerQRCode(customerId);
};

export const getUserTransactions = async (customerId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, merchants(business_name)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  return { data, error };
};

export const getRedeemedRewards = async (customerId: string) => {
  const { data, error } = await supabase
    .from('redeemed_rewards')
    .select('*, merchants(business_name)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  return { data, error };
};

export const updateUserLocation = async (customerId: string, latitude: number, longitude: number, accuracy: number) => {
  const { data, error } = await supabase
    .from('user_locations')
    .insert({
      customer_id: customerId,
      latitude,
      longitude,
      accuracy_meters: accuracy,
    });

  return { data, error };
};

export const createStoreVisit = async (customerId: string, merchantId: string, latitude: number, longitude: number) => {
  const { data, error } = await supabase
    .from('store_visits')
    .insert({
      customer_id: customerId,
      merchant_id: merchantId,
      visit_latitude: latitude,
      visit_longitude: longitude,
    });

  return { data, error };
};

// Convenience: get current user's loyalty cards
export const getCustomerLoyaltyCards = async () => {
  const { data: customer, error: customerError } = await getOrCreateCustomerProfile();
  if (customerError || !customer) return { data: null, error: customerError };
  return getUserLoyaltyCards(customer.id);
};
