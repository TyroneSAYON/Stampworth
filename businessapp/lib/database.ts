import { supabase } from '@/lib/supabase';

const CUSTOMER_QR_PREFIX = 'STAMPWORTH:';
const MERCHANT_LOGO_BUCKET = 'merchant-logos';
const MERCHANT_STAMP_ICON_BUCKET = 'merchant-stamp-icons';
const AUTH_SESSION_MISSING = 'AUTH_SESSION_MISSING';
const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const BACKEND_TIMEOUT_MS = 10000;
const SKIP_AUTH_MODE = process.env.EXPO_PUBLIC_SKIP_AUTH === 'true';
const GOOGLE_MAPS_API_KEY = 'AIzaSyC2VkT6Kj7MY1W2ilwIjXevs5cTYJU7OXIc';

const geocodeAddress = async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const encoded = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const data = await response.json();
    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return { latitude: lat, longitude: lng };
    }
    return null;
  } catch {
    return null;
  }
};

type MerchantProfile = {
  id: string;
  auth_id: string | null;
  owner_email: string;
  business_name: string;
  address?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type MerchantAccountInput = {
  email: string;
  businessName: string;
};

let mockMerchantProfile: MerchantProfile = {
  id: 'local-merchant',
  auth_id: 'local-auth',
  owner_email: 'demo@stampworth.local',
  business_name: 'Demo Business',
  address: 'Demo Address',
  website_url: null,
  logo_url: null,
};

let mockStampSettings = {
  merchant_id: 'local-merchant',
  stamps_per_redemption: 10,
  card_color: '#2F4366',
  stamp_color: '#2F4366',
  stamp_icon_name: 'star',
  stamp_icon_image_url: null as string | null,
  redemption_reward_description: 'Free reward',
  promotion_text: 'Demo conditions',
};

const toUploadableImage = async (uri: string) => {
  const fileExtension = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
  const normalizedExtension = fileExtension === 'png' ? 'png' : 'jpg';
  const contentType = normalizedExtension === 'png' ? 'image/png' : 'image/jpeg';
  const response = await fetch(uri);
  const fileData = await response.arrayBuffer();

  return {
    fileData,
    normalizedExtension,
    contentType,
  };
};

const uploadPublicImage = async (
  bucket: string,
  authUserId: string,
  uri: string,
  fileNamePrefix: string,
) => {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  const { fileData, normalizedExtension, contentType } = await toUploadableImage(uri);
  const filePath = `${authUserId}/${fileNamePrefix}.${normalizedExtension}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, fileData, {
    contentType,
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return `${publicUrl}?v=${Date.now()}`;
};

const deriveBusinessName = (email: string, preferredBusinessName?: string) => {
  if (preferredBusinessName?.trim()) {
    return preferredBusinessName.trim();
  }

  const localPart = email.split('@')[0] || 'business';
  const cleaned = localPart
    .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned ? `${cleaned} Business` : 'My Business';
};

const getAuthenticatedUser = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return { user: session.user, error: null };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (user) {
    return { user, error: null };
  }

  return { user: null, error: error || new Error(AUTH_SESSION_MISSING) };
};

const normalizeAuthError = (error: any) => {
  const message = (error?.message || '').toLowerCase();
  if (message.includes('auth session missing') || message.includes('invalid refresh token')) {
    return new Error(AUTH_SESSION_MISSING);
  }
  return error instanceof Error ? error : new Error(error?.message || 'Authentication required');
};

const ensureMerchantProfileViaBackend = async (businessName?: string) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    return { data: null, error: new Error(AUTH_SESSION_MISSING) };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/business/ensure-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        businessName,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        data: null,
        error: new Error(body?.message || `Unable to ensure merchant profile (${response.status})`),
      };
    }

    return {
      data: (body?.merchant || null) as MerchantProfile | null,
      error: null,
    };
  } catch (error: any) {
    const msg =
      error?.name === 'AbortError'
        ? `Backend ensure-profile request timed out after ${BACKEND_TIMEOUT_MS}ms`
        : error?.message || 'Network request failed';

    return {
      data: null,
      error: new Error(msg),
    };
  }
};

export const ensureCurrentMerchantProfile = async (preferredBusinessName?: string) => {
  if (SKIP_AUTH_MODE) {
    if (preferredBusinessName?.trim()) {
      mockMerchantProfile = {
        ...mockMerchantProfile,
        business_name: preferredBusinessName.trim(),
      };
    }

    return { data: mockMerchantProfile, error: null };
  }

  const { user, error: authError } = await getAuthenticatedUser();

  if (authError || !user) {
    return { data: null, error: normalizeAuthError(authError) };
  }

  const email = user.email || '';
  if (!email) {
    return { data: null, error: new Error('Authenticated merchant user does not have an email address') };
  }

  const { data: existingByAuth, error: byAuthError } = await supabase
    .from('merchants')
    .select('*')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (byAuthError) {
    return { data: null, error: byAuthError };
  }

  if (existingByAuth) {
    return { data: existingByAuth as MerchantProfile, error: null };
  }

  const { data: existingByEmail, error: byEmailError } = await supabase
    .from('merchants')
    .select('*')
    .eq('owner_email', email)
    .maybeSingle();

  if (byEmailError) {
    return { data: null, error: byEmailError };
  }

  if (existingByEmail) {
    if (existingByEmail.auth_id !== user.id) {
      const { data: updatedByEmail, error: relinkError } = await supabase
        .from('merchants')
        .update({ auth_id: user.id })
        .eq('id', existingByEmail.id)
        .select('*')
        .single();

      if (relinkError) {
        return { data: null, error: relinkError };
      }

      return { data: updatedByEmail as MerchantProfile, error: null };
    }

    return { data: existingByEmail as MerchantProfile, error: null };
  }

  const businessName = deriveBusinessName(
    email,
    preferredBusinessName ||
      (user.user_metadata?.business_name as string | undefined) ||
      (user.user_metadata?.full_name as string | undefined),
  );

  const { data: created, error: createError } = await supabase
    .from('merchants')
    .upsert(
      {
        auth_id: user.id,
        owner_email: email,
        business_name: businessName,
      },
      { onConflict: 'owner_email' },
    )
    .select('*')
    .single();

  if (createError) {
    const rlsBlocked =
      createError.message?.toLowerCase().includes('row-level security') ||
      createError.message?.toLowerCase().includes('permission') ||
      createError.message?.toLowerCase().includes('duplicate key');

    if (rlsBlocked) {
      const ensured = await ensureMerchantProfileViaBackend(businessName);
      if (!ensured.error && ensured.data) {
        return { data: ensured.data, error: null };
      }

      return {
        data: null,
        error:
          ensured.error ||
          new Error(`${createError.message}. Ensure-profile backend fallback failed.`),
      };
    }

    return { data: null, error: new Error(createError.message) };
  }

  return { data: created as MerchantProfile, error: null };
};

export const saveMerchantAccountInput = async ({ email, businessName }: MerchantAccountInput) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedBusinessName = businessName.trim();

  if (!normalizedEmail || !normalizedBusinessName) {
    return { data: null, error: new Error('Email and business name are required') };
  }

  if (SKIP_AUTH_MODE) {
    mockMerchantProfile = {
      ...mockMerchantProfile,
      owner_email: normalizedEmail,
      business_name: normalizedBusinessName,
    };

    return { data: mockMerchantProfile, error: null };
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError || !user) {
    return { data: null, error: normalizeAuthError(authError) };
  }

  const { data: existingByAuth } = await supabase
    .from('merchants')
    .select('*')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (existingByAuth) {
    const { data, error } = await supabase
      .from('merchants')
      .update({
        owner_email: normalizedEmail,
        business_name: normalizedBusinessName,
      })
      .eq('id', existingByAuth.id)
      .select('*')
      .single();

    return { data, error };
  }

  const { data, error } = await supabase
    .from('merchants')
    .upsert(
      {
        auth_id: user.id,
        owner_email: normalizedEmail,
        business_name: normalizedBusinessName,
      },
      { onConflict: 'owner_email' },
    )
    .select('*')
    .single();

  if (error && error.message?.toLowerCase().includes('row-level security')) {
    return ensureMerchantProfileViaBackend(normalizedBusinessName);
  }

  return { data, error };
};

export const recordMerchantLogin = async () => {
  if (SKIP_AUTH_MODE) {
    return { data: mockMerchantProfile, error: null };
  }

  const { data: merchant, error } = await ensureCurrentMerchantProfile();
  if (error || !merchant) {
    return { data: null, error: error || new Error('Merchant account not found') };
  }

  // Touching a tracked field reliably triggers updated_at, providing a DB trail for successful logins.
  const { data, error: updateError } = await supabase
    .from('merchants')
    .update({
      auth_id: merchant.auth_id,
      last_login_at: new Date().toISOString(),
      is_active: true,
    })
    .eq('id', merchant.id)
    .select('*')
    .single();

  return { data, error: updateError };
};

export const getCurrentMerchantProfile = async () => {
  return ensureCurrentMerchantProfile();
};

export const saveMerchantStoreSetup = async (payload: {
  businessName: string;
  email?: string;
  phone?: string;
  address: string;
  websiteUrl?: string;
  logoUri?: string | null;
}) => {
  if (SKIP_AUTH_MODE) {
    mockMerchantProfile = {
      ...mockMerchantProfile,
      business_name: payload.businessName.trim(),
      owner_email: payload.email?.trim().toLowerCase() || mockMerchantProfile.owner_email,
      address: payload.address.trim(),
      website_url: payload.websiteUrl?.trim() || null,
      logo_url: payload.logoUri || mockMerchantProfile.logo_url || null,
    };

    return { data: mockMerchantProfile, error: null };
  }

  const { user, error: authError } = await getAuthenticatedUser();

  if (authError || !user) {
    return { data: null, error: normalizeAuthError(authError) };
  }

  const { data: merchant, error: merchantError } = await ensureCurrentMerchantProfile(payload.businessName);
  if (merchantError || !merchant) {
    return { data: null, error: merchantError || new Error('Merchant account not found') };
  }

  let logoUrl = merchant.logo_url || null;
  if (payload.logoUri) {
    try {
      logoUrl = await uploadPublicImage(MERCHANT_LOGO_BUCKET, user.id, payload.logoUri, 'company-logo');
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' && error.message.toLowerCase().includes('bucket')
          ? `${error.message}. Create a public storage bucket named merchant-logos in Supabase first.`
          : error?.message || 'Unable to upload company logo.';
      return { data: null, error: new Error(message) };
    }
  }

  const updatePayload: Record<string, any> = {
    business_name: payload.businessName.trim(),
    address: payload.address.trim(),
    website_url: payload.websiteUrl?.trim() || null,
    logo_url: logoUrl,
  };

  // Geocode the address to get lat/lng for the map
  const coords = await geocodeAddress(payload.address.trim());
  if (coords) {
    updatePayload.latitude = coords.latitude;
    updatePayload.longitude = coords.longitude;
  }

  if (payload.email?.trim()) {
    updatePayload.owner_email = payload.email.trim().toLowerCase();
  }

  if (payload.phone !== undefined) {
    updatePayload.phone_number = payload.phone.trim() || null;
  }

  const { data, error } = await supabase
    .from('merchants')
    .update(updatePayload)
    .eq('id', merchant.id)
    .select('*')
    .single();

  // Also update Supabase Auth email if it changed
  if (!error && payload.email?.trim()) {
    const newEmail = payload.email.trim().toLowerCase();
    if (newEmail !== user.email) {
      await supabase.auth.updateUser({ email: newEmail });
    }
  }

  return { data, error };
};

export const getMerchantLoyaltyConfiguration = async () => {
  if (SKIP_AUTH_MODE) {
    return { data: mockStampSettings, error: null };
  }

  const { data: merchant, error: merchantError } = await ensureCurrentMerchantProfile();
  if (merchantError || !merchant) {
    return { data: null, error: merchantError || new Error('Merchant account not found') };
  }

  const { data, error } = await supabase
    .from('stamp_settings')
    .select('*')
    .eq('merchant_id', merchant.id)
    .maybeSingle();

  return { data, error };
};

export const saveMerchantLoyaltyConfiguration = async (payload: {
  cardColor: string;
  stampIconName: string;
  customIconUri?: string | null;
}) => {
  if (SKIP_AUTH_MODE) {
    mockStampSettings = {
      ...mockStampSettings,
      card_color: payload.cardColor,
      stamp_color: payload.cardColor,
      stamp_icon_name: payload.stampIconName,
      stamp_icon_image_url: payload.customIconUri || null,
    };

    return { data: mockStampSettings, error: null };
  }

  const { user, error: authError } = await getAuthenticatedUser();

  if (authError || !user) {
    return { data: null, error: normalizeAuthError(authError) };
  }

  const { data: merchant, error: merchantError } = await ensureCurrentMerchantProfile();
  if (merchantError || !merchant) {
    return { data: null, error: merchantError || new Error('Merchant account not found') };
  }

  let customIconUrl: string | null = null;
  if (payload.customIconUri) {
    try {
      customIconUrl = await uploadPublicImage(MERCHANT_STAMP_ICON_BUCKET, user.id, payload.customIconUri, 'stamp-icon');
    } catch (error: any) {
      const message =
        typeof error?.message === 'string' && error.message.toLowerCase().includes('bucket')
          ? `${error.message}. Create a public storage bucket named merchant-stamp-icons in Supabase first.`
          : error?.message || 'Unable to upload custom stamp icon.';
      return { data: null, error: new Error(message) };
    }
  }

  const { data, error } = await supabase
    .from('stamp_settings')
    .upsert(
      {
        merchant_id: merchant.id,
        card_color: payload.cardColor,
        stamp_color: payload.cardColor,
        stamp_icon_name: payload.stampIconName,
        stamp_icon_image_url: customIconUrl,
      },
      { onConflict: 'merchant_id' },
    )
    .select('*')
    .single();

  return { data, error };
};

export const saveMerchantStampProgramConfiguration = async (payload: {
  stampsPerRedemption: number;
  rewardDescription: string;
  conditions: string;
}) => {
  if (SKIP_AUTH_MODE) {
    mockStampSettings = {
      ...mockStampSettings,
      stamps_per_redemption: payload.stampsPerRedemption,
      redemption_reward_description: payload.rewardDescription.trim(),
      promotion_text: payload.conditions.trim(),
    };

    return { data: mockStampSettings, error: null };
  }

  const { user, error: authError } = await getAuthenticatedUser();

  if (authError || !user) {
    return { data: null, error: normalizeAuthError(authError) };
  }

  const { data: merchant, error: merchantError } = await ensureCurrentMerchantProfile();
  if (merchantError || !merchant) {
    return { data: null, error: merchantError || new Error('Merchant account not found') };
  }

  const { data, error } = await supabase
    .from('stamp_settings')
    .upsert(
      {
        merchant_id: merchant.id,
        stamps_per_redemption: payload.stampsPerRedemption,
        redemption_reward_description: payload.rewardDescription.trim(),
        promotion_text: payload.conditions.trim(),
      },
      { onConflict: 'merchant_id' },
    )
    .select('*')
    .single();

  return { data, error };
};

export const getMerchantStampRules = async (merchantId: string) => {
  const { data, error } = await supabase
    .from('stamp_settings')
    .select('stamps_per_redemption, promotion_text')
    .eq('merchant_id', merchantId)
    .maybeSingle();

  return { data, error };
};

export const resolveCustomerFromScannedQR = async (scannedValue: string) => {
  if (!scannedValue.startsWith(CUSTOMER_QR_PREFIX)) {
    return { data: null, error: new Error('Invalid QR format. Only customerapp QR codes are accepted.') };
  }

  // Format: STAMPWORTH:<customer_id>
  const customerIdFromPayload = scannedValue.slice(CUSTOMER_QR_PREFIX.length);
  if (!customerIdFromPayload) {
    return { data: null, error: new Error('Malformed customer QR code.') };
  }

  const { data: qrRecord, error: qrError } = await supabase
    .from('customer_qr_codes')
    .select('id, customer_id, qr_code_value, is_active')
    .eq('qr_code_value', scannedValue)
    .eq('is_active', true)
    .single();

  if (qrError || !qrRecord) {
    return { data: null, error: new Error('QR code not recognized or no longer active.') };
  }

  if (qrRecord.customer_id !== customerIdFromPayload) {
    return { data: null, error: new Error('QR payload mismatch. Please rescan a valid customerapp code.') };
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, full_name, username, email')
    .eq('id', qrRecord.customer_id)
    .single();

  if (customerError || !customer) {
    return { data: null, error: new Error('Customer not found for this QR code.') };
  }

  return {
    data: {
      customer,
      qr: qrRecord,
    },
    error: null,
  };
};

export const logScanEvent = async (merchantId: string, customerId: string) => {
  // Get or create loyalty card so the customer app can navigate to it
  const { data: existingCard } = await supabase
    .from('loyalty_cards')
    .select('id, stamp_count')
    .eq('merchant_id', merchantId)
    .eq('customer_id', customerId)
    .maybeSingle();

  // Log a scan transaction so customer app's Realtime listener picks it up
  await supabase.from('transactions').insert({
    merchant_id: merchantId,
    customer_id: customerId,
    loyalty_card_id: existingCard?.id || null,
    transaction_type: 'CUSTOMER_SCANNED',
    stamp_count_after: existingCard?.stamp_count || 0,
    notes: 'QR code scanned by merchant',
  });
};

export const resolveCustomerById = async (input: string) => {
  const query = input.trim();
  if (!query) return { data: null, error: new Error('Please enter a customer ID, username, or email.') };

  // 1. Try exact UUID match
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
  if (isUuid) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, username, email')
      .eq('id', query)
      .maybeSingle();
    if (data) return { data, error: null };
    if (error) return { data: null, error };
  }

  // 2. Try username (case-insensitive, with or without @)
  const cleanUsername = query.replace(/^@/, '').toLowerCase();
  const { data: byUsername } = await supabase
    .from('customers')
    .select('id, full_name, username, email')
    .ilike('username', cleanUsername)
    .maybeSingle();
  if (byUsername) return { data: byUsername, error: null };

  // 3. Try email (case-insensitive)
  if (query.includes('@')) {
    const { data: byEmail } = await supabase
      .from('customers')
      .select('id, full_name, username, email')
      .ilike('email', query)
      .maybeSingle();
    if (byEmail) return { data: byEmail, error: null };
  }

  // 4. Try short customer code (first 8 chars of UUID, uppercase from QR display)
  const shortCode = query.toLowerCase();
  if (/^[0-9a-f]{4,12}$/i.test(shortCode)) {
    const { data: allCustomers } = await supabase
      .from('customers')
      .select('id, full_name, username, email')
      .limit(2000);
    const match = (allCustomers || []).find((c: any) => c.id.toLowerCase().startsWith(shortCode));
    if (match) return { data: match, error: null };
  }

  return { data: null, error: new Error('Customer not found. Try ID, @username, or email.') };
};

export const issueStampForCustomer = async (
  merchantId: string,
  customerId: string,
  source: 'QR' | 'MANUAL',
  sourceReference?: string,
) => {
  // Always fetch the latest card state to avoid stale stamp_count
  const { data: existingCard } = await supabase
    .from('loyalty_cards')
    .select('id, stamp_count, total_stamps_earned, status, is_free_redemption, customer_id, merchant_id')
    .eq('customer_id', customerId)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  let loyaltyCard = existingCard;

  if (!loyaltyCard) {
    const { data: newCard, error: createCardError } = await supabase
      .from('loyalty_cards')
      .insert({
        customer_id: customerId,
        merchant_id: merchantId,
      })
      .select('*')
      .maybeSingle();

    if (createCardError || !newCard) {
      return { data: null, error: createCardError || new Error('Unable to create loyalty card.') };
    }

    loyaltyCard = newCard;
  }

  if (!loyaltyCard) return { data: null, error: new Error('Unable to find or create loyalty card.') };

  // Use the DB values directly for accuracy
  const currentCount = loyaltyCard.stamp_count ?? 0;
  const currentTotal = loyaltyCard.total_stamps_earned ?? 0;
  const nextStampCount = currentCount + 1;
  const totalStampsEarned = currentTotal + 1;

  const { data: settings } = await supabase
    .from('stamp_settings')
    .select('stamps_per_redemption')
    .eq('merchant_id', merchantId)
    .maybeSingle();

  const stampsPerRedemption = settings?.stamps_per_redemption || 10;
  const freeRedemptionReached = nextStampCount >= stampsPerRedemption - 1;

  const { data: stamp, error: stampError } = await supabase
    .from('stamps')
    .insert({
      loyalty_card_id: loyaltyCard.id,
      merchant_id: merchantId,
      customer_id: customerId,
      earned_date: new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (stampError || !stamp) {
    return { data: null, error: stampError || new Error('Unable to issue stamp.') };
  }

  const { error: cardUpdateError } = await supabase
    .from('loyalty_cards')
    .update({
      stamp_count: nextStampCount,
      total_stamps_earned: totalStampsEarned,
      is_free_redemption: freeRedemptionReached,
      status: freeRedemptionReached ? 'FREE_REDEMPTION' : 'ACTIVE',
    })
    .eq('id', loyaltyCard.id);

  if (cardUpdateError) {
    return { data: null, error: cardUpdateError };
  }

  const notePrefix = source === 'QR' ? 'Issued from customer QR scan' : 'Issued from manual customer ID entry';
  const notes = sourceReference ? `${notePrefix} (${sourceReference.slice(0, 24)})` : notePrefix;

  await supabase.from('transactions').insert({
    merchant_id: merchantId,
    customer_id: customerId,
    loyalty_card_id: loyaltyCard.id,
    transaction_type: 'STAMP_EARNED',
    stamp_count_after: nextStampCount,
    notes,
  });

  return {
    data: {
      stamp,
      loyaltyCardId: loyaltyCard.id,
      stampCount: nextStampCount,
      freeRedemptionReached,
    },
    error: null,
  };
};

export const getCustomerLoyaltyCardProgress = async (merchantId: string, customerId: string) => {
  // Run all queries in parallel
  const [customerResult, cardResult, merchantResult, settingsResult] = await Promise.all([
    supabase.from('customers').select('id, full_name, username, email').eq('id', customerId).maybeSingle(),
    supabase.from('loyalty_cards').select('*').eq('customer_id', customerId).eq('merchant_id', merchantId).maybeSingle(),
    supabase.from('merchants').select('business_name, logo_url').eq('id', merchantId).maybeSingle(),
    supabase.from('stamp_settings').select('stamps_per_redemption, redemption_reward_description, promotion_text, card_color, stamp_icon_name, stamp_icon_image_url').eq('merchant_id', merchantId).maybeSingle(),
  ]);

  const { data: customer, error: customerError } = customerResult;
  if (customerError || !customer) {
    return { data: null, error: customerError || new Error('Customer not found.') };
  }

  const { data: card, error: cardError } = cardResult;
  if (cardError) {
    return { data: null, error: cardError };
  }

  const { data: merchant } = merchantResult;
  const { data: settings, error: settingsError } = settingsResult;
  if (settingsError) {
    return { data: null, error: settingsError };
  }

  const stampsPerRedemption = settings?.stamps_per_redemption || 10;

  // Derive stamp count from actual valid stamp records
  let stampCount = card?.stamp_count || 0;
  if (card) {
    const { count } = await supabase
      .from('stamps')
      .select('id', { count: 'exact', head: true })
      .eq('loyalty_card_id', card.id)
      .eq('is_valid', true);
    const actualCount = count ?? stampCount;
    if (actualCount !== stampCount) {
      stampCount = actualCount;
      supabase.from('loyalty_cards').update({ stamp_count: actualCount }).eq('id', card.id).then(() => {});
    }
  }

  return {
    data: {
      customer,
      card: card || null,
      stampCount,
      stampsPerRedemption,
      merchantName: merchant?.business_name || 'Store',
      merchantLogoUrl: merchant?.logo_url || null,
      rewardDescription: settings?.redemption_reward_description || null,
      conditions: settings?.promotion_text || null,
      cardColor: settings?.card_color || '#2F4366',
      stampIconName: settings?.stamp_icon_name || 'star',
      stampIconImageUrl: settings?.stamp_icon_image_url || null,
      freeRedemptionReached: stampCount >= stampsPerRedemption - 1,
    },
    error: null,
  };
};

export const removeLatestStampForCustomer = async (
  merchantId: string,
  customerId: string,
  source: 'QR' | 'MANUAL',
  sourceReference?: string,
) => {
  const { data: card, error: cardError } = await supabase
    .from('loyalty_cards')
    .select('*')
    .eq('customer_id', customerId)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (cardError) {
    return { data: null, error: cardError };
  }

  if (!card) {
    return { data: null, error: new Error('No loyalty card found for this customer at your store.') };
  }

  const currentStampCount = card.stamp_count || 0;
  if (currentStampCount <= 0) {
    return { data: null, error: new Error('No stamps available to delete.') };
  }

  const { data: latestStamp, error: latestStampError } = await supabase
    .from('stamps')
    .select('id')
    .eq('loyalty_card_id', card.id)
    .eq('merchant_id', merchantId)
    .eq('customer_id', customerId)
    .eq('is_valid', true)
    .order('earned_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestStampError) {
    return { data: null, error: latestStampError };
  }

  if (!latestStamp?.id) {
    return { data: null, error: new Error('No valid stamp record found to delete.') };
  }

  const { error: stampUpdateError } = await supabase
    .from('stamps')
    .update({ is_valid: false })
    .eq('id', latestStamp.id);

  if (stampUpdateError) {
    return { data: null, error: stampUpdateError };
  }

  const { data: settings } = await supabase
    .from('stamp_settings')
    .select('stamps_per_redemption')
    .eq('merchant_id', merchantId)
    .maybeSingle();

  const stampsPerRedemption = settings?.stamps_per_redemption || 10;
  const nextStampCount = Math.max(0, currentStampCount - 1);
  const freeRedemptionReached = nextStampCount >= stampsPerRedemption - 1;

  const { error: cardUpdateError } = await supabase
    .from('loyalty_cards')
    .update({
      stamp_count: nextStampCount,
      is_free_redemption: freeRedemptionReached,
      status: freeRedemptionReached ? 'FREE_REDEMPTION' : 'ACTIVE',
    })
    .eq('id', card.id);

  if (cardUpdateError) {
    return { data: null, error: cardUpdateError };
  }

  const notePrefix = source === 'QR' ? 'Stamp deleted after customer QR scan' : 'Stamp deleted after manual customer ID entry';
  const notes = sourceReference ? `${notePrefix} (${sourceReference.slice(0, 24)})` : notePrefix;

  await supabase.from('transactions').insert({
    merchant_id: merchantId,
    customer_id: customerId,
    loyalty_card_id: card.id,
    transaction_type: 'STAMP_REMOVED',
    stamp_count_after: nextStampCount,
    notes,
  });

  return {
    data: {
      loyaltyCardId: card.id,
      stampCount: nextStampCount,
      freeRedemptionReached,
    },
    error: null,
  };
};

// Check if merchant has completed store setup (has address set)
export const isMerchantSetupComplete = async () => {
  const { data: merchant, error } = await ensureCurrentMerchantProfile();
  if (error || !merchant) return { complete: false, error };
  const hasAddress = !!merchant.address && merchant.address !== 'To be updated';
  return { complete: hasAddress, error: null };
};

export const sendSupportMessage = async (subject: string, message: string) => {
  const { data: merchant, error } = await ensureCurrentMerchantProfile();
  if (error || !merchant) return { error: error || new Error('Not authenticated') };
  const { error: insertError } = await supabase.from('support_messages').insert({
    sender_type: 'merchant',
    sender_id: merchant.id,
    sender_email: merchant.owner_email,
    sender_name: merchant.business_name || null,
    subject: subject || null,
    message,
  });
  return { error: insertError };
};

// Reset loyalty program — clears all stamps, cards, rewards, and transactions for this merchant
export const resetLoyaltyProgram = async () => {
  const { data: merchant, error: merchantError } = await ensureCurrentMerchantProfile();
  if (merchantError || !merchant) return { error: merchantError || new Error('Merchant not found') };

  const merchantId = merchant.id;

  try {
    // Get all loyalty card IDs for this merchant
    const { data: cards } = await supabase
      .from('loyalty_cards')
      .select('id')
      .eq('merchant_id', merchantId);

    const cardIds = (cards || []).map((c) => c.id);

    // Delete stamps by card IDs and merchant ID
    if (cardIds.length > 0) {
      const { error: e1 } = await supabase.from('stamps').delete().in('loyalty_card_id', cardIds);
      if (e1) console.warn('stamps delete by card:', e1.message);
    }
    const { error: e2 } = await supabase.from('stamps').delete().eq('merchant_id', merchantId);
    if (e2) console.warn('stamps delete by merchant:', e2.message);

    // Delete redeemed rewards
    const { error: e3 } = await supabase.from('redeemed_rewards').delete().eq('merchant_id', merchantId);
    if (e3) console.warn('rewards delete:', e3.message);

    // Delete transactions
    const { error: e4 } = await supabase.from('transactions').delete().eq('merchant_id', merchantId);
    if (e4) console.warn('transactions delete:', e4.message);

    // Delete loyalty cards
    const { error: e5 } = await supabase.from('loyalty_cards').delete().eq('merchant_id', merchantId);
    if (e5) console.warn('cards delete:', e5.message);

    // If any critical delete failed, report the last error
    if (e5) return { error: new Error('Could not delete loyalty cards: ' + e5.message) };

    return { error: null };
  } catch (err: any) {
    return { error: new Error(err.message || 'Reset failed') };
  }
};

// Announcements
export const saveMerchantAnnouncement = async (message: string) => {
  const { data: merchant, error: merchantError } = await ensureCurrentMerchantProfile();
  if (merchantError || !merchant) return { data: null, error: merchantError || new Error('Merchant not found') };

  const { data, error } = await supabase
    .from('merchant_announcements')
    .insert({ merchant_id: merchant.id, message, is_active: true })
    .select('*')
    .single();

  return { data, error };
};

export const getMerchantAnnouncements = async () => {
  const { data: merchant, error: merchantError } = await ensureCurrentMerchantProfile();
  if (merchantError || !merchant) return { data: null, error: merchantError };

  const { data, error } = await supabase
    .from('merchant_announcements')
    .select('*')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return { data, error };
};

// Explore analytics
export const getMerchantExploreAnalytics = async () => {
  const { data: merchant, error: merchantError } = await ensureCurrentMerchantProfile();
  if (merchantError || !merchant) return { data: null, error: merchantError };

  // Total redeemed
  const { count: totalRedeemed } = await supabase
    .from('redeemed_rewards')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id);

  // Most loyal customer (most stamps earned)
  const { data: topCards } = await supabase
    .from('loyalty_cards')
    .select('customer_id, total_stamps_earned, stamp_count, customers(id, full_name, username, email)')
    .eq('merchant_id', merchant.id)
    .order('total_stamps_earned', { ascending: false })
    .limit(1);

  const mostLoyal = topCards?.[0] || null;

  // All loyalty card holders for this merchant
  const { data: allCards } = await supabase
    .from('loyalty_cards')
    .select('customer_id, stamp_count, total_stamps_earned, status, is_free_redemption, customers(id, full_name, username, email)')
    .eq('merchant_id', merchant.id)
    .order('total_stamps_earned', { ascending: false });

  return {
    data: {
      merchantId: merchant.id,
      totalRedeemed: totalRedeemed || 0,
      mostLoyal: mostLoyal ? {
        customerId: mostLoyal.customer_id,
        name: (mostLoyal.customers as any)?.full_name || (mostLoyal.customers as any)?.username || 'Unknown',
        email: (mostLoyal.customers as any)?.email || '',
        totalStampsEarned: mostLoyal.total_stamps_earned || 0,
        currentStamps: mostLoyal.stamp_count || 0,
      } : null,
      cardHolders: (allCards || []).map((c: any) => ({
        customerId: c.customer_id,
        name: c.customers?.full_name || c.customers?.username || 'Unknown',
        email: c.customers?.email || '',
        stampCount: c.stamp_count || 0,
        totalStampsEarned: c.total_stamps_earned || 0,
        status: c.status,
        isFreeRedemption: c.is_free_redemption,
      })),
    },
    error: null,
  };
};

// Search customers by name or email
export const searchCustomers = async (query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return { data: [], error: null };

  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, username, email')
    .or(`full_name.ilike.%${q}%,username.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(20);

  return { data: data || [], error };
};

// Get individual stamp records for a loyalty card (with dates)
export const getStampRecords = async (merchantId: string, customerId: string) => {
  const { data: card } = await supabase
    .from('loyalty_cards')
    .select('id')
    .eq('customer_id', customerId)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (!card) return { data: [], error: null };

  const { data, error } = await supabase
    .from('stamps')
    .select('id, earned_date, is_valid')
    .eq('loyalty_card_id', card.id)
    .eq('is_valid', true)
    .order('earned_date', { ascending: true });

  return { data: data || [], error };
};

// Redeem reward — reset stamps to 0 and create a redeemed_rewards record
// Store a reward (stamps full → reset to 0, reward saved as unclaimed)
export const storeCustomerReward = async (merchantId: string, customerId: string) => {
  const { data: card, error: cardError } = await supabase
    .from('loyalty_cards')
    .select('*')
    .eq('customer_id', customerId)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (cardError || !card) return { data: null, error: cardError || new Error('No loyalty card found.') };

  const { data: settings } = await supabase
    .from('stamp_settings')
    .select('stamps_per_redemption, redemption_reward_description')
    .eq('merchant_id', merchantId)
    .maybeSingle();

  const required = settings?.stamps_per_redemption || 10;

  const rewardCode = `RW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await supabase.from('redeemed_rewards').insert({
    loyalty_card_id: card.id,
    merchant_id: merchantId,
    customer_id: customerId,
    stamps_used: required,
    reward_code: rewardCode,
    is_used: false,
  });

  // Invalidate all current stamps
  await supabase.from('stamps').update({ is_valid: false }).eq('loyalty_card_id', card.id).eq('is_valid', true);

  // Reset stamp count
  await supabase.from('loyalty_cards').update({ stamp_count: 0, is_free_redemption: false, status: 'ACTIVE' }).eq('id', card.id);

  await supabase.from('transactions').insert({
    merchant_id: merchantId,
    customer_id: customerId,
    loyalty_card_id: card.id,
    transaction_type: 'REWARD_STORED',
    stamp_count_after: 0,
    notes: `Reward stored: ${settings?.redemption_reward_description || 'Reward'}. Code: ${rewardCode}`,
  });

  return { data: { rewardCode, rewardDescription: settings?.redemption_reward_description || 'Reward' }, error: null };
};

// Get unclaimed rewards for a customer at a merchant
export const getPendingRewards = async (merchantId: string, customerId: string) => {
  const { data, error } = await supabase
    .from('redeemed_rewards')
    .select('id, reward_code, stamps_used, created_at')
    .eq('merchant_id', merchantId)
    .eq('customer_id', customerId)
    .eq('is_used', false)
    .order('created_at', { ascending: false });

  return { data: data || [], error };
};

// Claim (use) a stored reward
export const claimReward = async (rewardId: string) => {
  const { data, error } = await supabase
    .from('redeemed_rewards')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('id', rewardId)
    .select('*')
    .maybeSingle();

  // Log a transaction so customer app realtime picks it up
  if (data && !error) {
    await supabase.from('transactions').insert({
      merchant_id: data.merchant_id,
      customer_id: data.customer_id,
      loyalty_card_id: data.loyalty_card_id || null,
      transaction_type: 'REWARD_REDEEMED',
      stamp_count_after: 0,
      notes: `Reward claimed: ${data.reward_code}`,
    });
  }

  return { data, error };
};

// Save merchant's GPS location to database
export const saveMerchantLocation = async (latitude: number, longitude: number) => {
  const { data: merchant, error: merchantError } = await ensureCurrentMerchantProfile();
  if (merchantError || !merchant) return { data: null, error: merchantError };

  const { data, error } = await supabase
    .from('merchants')
    .update({ latitude, longitude })
    .eq('id', merchant.id)
    .select('*')
    .maybeSingle();

  return { data, error };
};

// Get all customers who have recent location data (active Stampworth users)
export const getNearbyCustomersWithLocation = async (_merchantId: string) => {
  // Get recent locations (last 30 minutes) to show active users
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: locations } = await supabase
    .from('user_locations')
    .select('customer_id, latitude, longitude, created_at')
    .gte('created_at', thirtyMinAgo)
    .order('created_at', { ascending: false });

  if (!locations || locations.length === 0) return { data: [], error: null };

  // Build map of latest location per customer
  const locationMap = new Map<string, { latitude: number; longitude: number; updatedAt: string }>();
  for (const loc of locations) {
    if (!locationMap.has(loc.customer_id)) {
      locationMap.set(loc.customer_id, { latitude: loc.latitude, longitude: loc.longitude, updatedAt: loc.created_at });
    }
  }

  const customerIds = [...locationMap.keys()];

  // Get customer details
  const { data: customers } = await supabase
    .from('customers')
    .select('id, full_name, username, email')
    .in('id', customerIds);

  const result = (customers || [])
    .filter((c: any) => locationMap.has(c.id))
    .map((c: any) => ({
      id: c.id,
      name: c.full_name || c.username || 'Customer',
      email: c.email,
      ...locationMap.get(c.id)!,
    }));

  return { data: result, error: null };
};

export const getMerchantDashboardSnapshot = async () => {
  if (SKIP_AUTH_MODE) {
    return {
      data: {
        merchant: mockMerchantProfile,
        settings: mockStampSettings,
        stats: {
          activeUsers: 1,
          stampsIssued: 0,
          rewardsRedeemed: 0,
        },
      },
      error: null,
    };
  }

  const { data: merchant, error: merchantError } = await ensureCurrentMerchantProfile();
  if (merchantError || !merchant) {
    return { data: null, error: merchantError || new Error('Merchant account not found') };
  }

  const { data: settings, error: settingsError } = await supabase
    .from('stamp_settings')
    .select('stamps_per_redemption, card_color, stamp_icon_name, stamp_icon_image_url')
    .eq('merchant_id', merchant.id)
    .maybeSingle();

  if (settingsError) {
    return { data: null, error: settingsError };
  }

  const { count: activeUsers, error: usersError } = await supabase
    .from('loyalty_cards')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id);

  const { count: stampsIssued, error: stampsError } = await supabase
    .from('stamps')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id);

  const { count: rewardsRedeemed, error: rewardsError } = await supabase
    .from('redeemed_rewards')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id);

  if (usersError || stampsError || rewardsError) {
    return { data: null, error: usersError || stampsError || rewardsError };
  }

  return {
    data: {
      merchant,
      settings: settings || null,
      stats: {
        activeUsers: activeUsers || 0,
        stampsIssued: stampsIssued || 0,
        rewardsRedeemed: rewardsRedeemed || 0,
      },
    },
    error: null,
  };
};
