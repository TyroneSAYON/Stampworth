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

  // Quick lookup first — covers returning users instantly
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

  // New user — create the row immediately instead of waiting for DB trigger
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
    // Duplicate from trigger race — just fetch the existing row
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
  // First get the loyalty cards
  const { data: cards, error: cardsError } = await supabase
    .from('loyalty_cards')
    .select('*')
    .eq('customer_id', customerId);

  if (cardsError || !cards || cards.length === 0) {
    return { data: cards || [], error: cardsError };
  }

  // Fetch merchants, settings, and stamp counts in parallel
  const merchantIds = [...new Set(cards.map((c: any) => c.merchant_id))];
  const cardIds = cards.map((c: any) => c.id);

  const [{ data: merchants }, { data: settings }, { data: allStamps }] = await Promise.all([
    supabase.from('merchants').select('id, business_name, logo_url, latitude, longitude').in('id', merchantIds),
    supabase.from('stamp_settings').select('*').in('merchant_id', merchantIds),
    supabase.from('stamps').select('loyalty_card_id').in('loyalty_card_id', cardIds).eq('is_valid', true),
  ]);

  const merchantMap = new Map((merchants || []).map((m: any) => [m.id, m]));
  const settingsMap = new Map((settings || []).map((s: any) => [s.merchant_id, s]));

  const stampCountMap: Record<string, number> = {};
  for (const s of allStamps || []) {
    stampCountMap[s.loyalty_card_id] = (stampCountMap[s.loyalty_card_id] || 0) + 1;
  }

  const enriched = cards.map((card: any) => {
    const actualCount = stampCountMap[card.id] ?? card.stamp_count ?? 0;
    const stampsPerRedemption = settingsMap.get(card.merchant_id)?.stamps_per_redemption || 10;
    const isFreeRedemption = actualCount >= stampsPerRedemption - 1;
    // Auto-sync if out of date
    if (actualCount !== (card.stamp_count ?? 0) || isFreeRedemption !== (card.is_free_redemption ?? false)) {
      supabase.from('loyalty_cards').update({
        stamp_count: actualCount,
        is_free_redemption: isFreeRedemption,
        status: isFreeRedemption ? 'FREE_REDEMPTION' : 'ACTIVE',
      }).eq('id', card.id).then(() => {});
    }
    return {
      ...card,
      stamp_count: actualCount,
      is_free_redemption: isFreeRedemption,
      merchants: merchantMap.get(card.merchant_id) || null,
      stamp_settings: settingsMap.get(card.merchant_id) || null,
    };
  });

  return { data: enriched, error: null };
};

export const getCustomerAnnouncements = async (customerId: string) => {
  // Get merchant IDs the customer has loyalty cards with
  const { data: cards } = await supabase
    .from('loyalty_cards')
    .select('merchant_id')
    .eq('customer_id', customerId);

  const merchantIds = [...new Set((cards || []).map((c: any) => c.merchant_id).filter(Boolean))];
  if (merchantIds.length === 0) return { data: [], error: null };

  // Get announcements
  const { data: announcements, error } = await supabase
    .from('merchant_announcements')
    .select('id, merchant_id, message, created_at')
    .eq('is_active', true)
    .in('merchant_id', merchantIds)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !announcements) return { data: [], error };

  // Get merchant names separately to avoid RLS join issues
  const annMerchantIds = [...new Set(announcements.map((a: any) => a.merchant_id))];
  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, business_name')
    .in('id', annMerchantIds);

  const merchantMap = new Map((merchants || []).map((m: any) => [m.id, m]));

  const enriched = announcements.map((a: any) => ({
    ...a,
    merchants: merchantMap.get(a.merchant_id) || { business_name: 'Store' },
  }));

  return { data: enriched, error: null };
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

// Get stamp records for a loyalty card (valid only, ordered by date)
export const getStampRecordsForCard = async (loyaltyCardId: string) => {
  const { data, error } = await supabase
    .from('stamps')
    .select('id, earned_date, is_valid')
    .eq('loyalty_card_id', loyaltyCardId)
    .eq('is_valid', true)
    .order('earned_date', { ascending: true });

  return { data: data || [], error };
};

export const sendSupportMessage = async (subject: string, message: string) => {
  const { data: customer, error } = await getOrCreateCustomerProfile();
  if (error || !customer) return { error: error || new Error('Not authenticated') };
  const { error: insertError } = await supabase.from('support_messages').insert({
    sender_type: 'customer',
    sender_id: customer.id,
    sender_email: customer.email,
    sender_name: customer.full_name || customer.username || null,
    subject: subject || null,
    message,
  });
  return { error: insertError };
};

// Get pending (unclaimed) rewards for current customer at a merchant
// Delete a loyalty card and all related data for the current customer
export const deleteCustomerLoyaltyCard = async (loyaltyCardId: string, merchantId: string) => {
  const { data: customer, error: customerError } = await getOrCreateCustomerProfile();
  if (customerError || !customer) return { error: customerError || new Error('Not authenticated') };

  // Delete stamps for this card
  await supabase.from('stamps').delete().eq('loyalty_card_id', loyaltyCardId).eq('customer_id', customer.id);
  // Delete rewards for this merchant+customer
  await supabase.from('redeemed_rewards').delete().eq('merchant_id', merchantId).eq('customer_id', customer.id);
  // Delete transactions for this merchant+customer
  await supabase.from('transactions').delete().eq('merchant_id', merchantId).eq('customer_id', customer.id);
  // Delete the loyalty card
  const { error } = await supabase.from('loyalty_cards').delete().eq('id', loyaltyCardId).eq('customer_id', customer.id);

  return { error };
};

export const getCustomerPendingRewards = async (merchantId: string) => {
  const { data: customer } = await getOrCreateCustomerProfile();
  if (!customer) return { data: [], error: null };

  const { data, error } = await supabase
    .from('redeemed_rewards')
    .select('id, reward_code, stamps_used, created_at')
    .eq('merchant_id', merchantId)
    .eq('customer_id', customer.id)
    .eq('is_used', false)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
};

// Convenience: get current user's loyalty cards
export const getCustomerLoyaltyCards = async () => {
  const { data: customer, error: customerError } = await getOrCreateCustomerProfile();
  if (customerError || !customer) return { data: null, error: customerError };
  return getUserLoyaltyCards(customer.id);
};
