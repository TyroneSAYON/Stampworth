import { supabase } from '@/lib/supabase';

const CUSTOMER_QR_PREFIX = 'STAMPWORTH:';
const MERCHANT_LOGO_BUCKET = 'merchant-logos';
const MERCHANT_STAMP_ICON_BUCKET = 'merchant-stamp-icons';
const AUTH_SESSION_MISSING = 'AUTH_SESSION_MISSING';
const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
const BACKEND_TIMEOUT_MS = 10000;
const SKIP_AUTH_MODE = process.env.EXPO_PUBLIC_SKIP_AUTH === 'true';

type MerchantProfile = {
  id: string;
  auth_id: string | null;
  owner_email: string;
  business_name: string;
  address?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
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
    .insert({
      auth_id: user.id,
      owner_email: email,
      business_name: businessName,
    })
    .select('*')
    .single();

  if (createError) {
    const rlsBlocked =
      createError.message?.toLowerCase().includes('row-level security') ||
      createError.message?.toLowerCase().includes('permission');

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
  address: string;
  websiteUrl?: string;
  logoUri?: string | null;
}) => {
  if (SKIP_AUTH_MODE) {
    mockMerchantProfile = {
      ...mockMerchantProfile,
      business_name: payload.businessName.trim(),
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

  const { data, error } = await supabase
    .from('merchants')
    .update({
      business_name: payload.businessName.trim(),
      address: payload.address.trim(),
      website_url: payload.websiteUrl?.trim() || null,
      logo_url: logoUrl,
    })
    .eq('id', merchant.id)
    .select('*')
    .single();

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

  const segments = scannedValue.split(':');
  if (segments.length < 4 || !segments[1]) {
    return { data: null, error: new Error('Malformed customer QR code.') };
  }

  const customerIdFromPayload = segments[1];

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

export const resolveCustomerById = async (customerId: string) => {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, username, email')
    .eq('id', customerId)
    .single();

  return { data, error };
};

export const issueStampForCustomer = async (
  merchantId: string,
  customerId: string,
  source: 'QR' | 'MANUAL',
  sourceReference?: string,
) => {
  const { data: existingCard } = await supabase
    .from('loyalty_cards')
    .select('*')
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
      .single();

    if (createCardError || !newCard) {
      return { data: null, error: createCardError || new Error('Unable to create loyalty card.') };
    }

    loyaltyCard = newCard;
  }

  const nextStampCount = (loyaltyCard.stamp_count || 0) + 1;
  const totalStampsEarned = (loyaltyCard.total_stamps_earned || 0) + 1;

  const { data: settings } = await supabase
    .from('stamp_settings')
    .select('stamps_per_redemption')
    .eq('merchant_id', merchantId)
    .maybeSingle();

  const stampsPerRedemption = settings?.stamps_per_redemption || 10;
  const freeRedemptionReached = nextStampCount >= stampsPerRedemption;

  const { data: stamp, error: stampError } = await supabase
    .from('stamps')
    .insert({
      loyalty_card_id: loyaltyCard.id,
      merchant_id: merchantId,
      customer_id: customerId,
      earned_date: new Date().toISOString(),
    })
    .select('*')
    .single();

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
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, full_name, username, email')
    .eq('id', customerId)
    .single();

  if (customerError || !customer) {
    return { data: null, error: customerError || new Error('Customer not found.') };
  }

  const { data: card, error: cardError } = await supabase
    .from('loyalty_cards')
    .select('*')
    .eq('customer_id', customerId)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (cardError) {
    return { data: null, error: cardError };
  }

  const { data: settings, error: settingsError } = await supabase
    .from('stamp_settings')
    .select('stamps_per_redemption, redemption_reward_description, promotion_text, card_color, stamp_icon_name, stamp_icon_image_url')
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (settingsError) {
    return { data: null, error: settingsError };
  }

  const stampCount = card?.stamp_count || 0;
  const stampsPerRedemption = settings?.stamps_per_redemption || 10;

  return {
    data: {
      customer,
      card: card || null,
      stampCount,
      stampsPerRedemption,
      rewardDescription: settings?.redemption_reward_description || null,
      conditions: settings?.promotion_text || null,
      cardColor: settings?.card_color || '#2F4366',
      stampIconName: settings?.stamp_icon_name || 'star',
      stampIconImageUrl: settings?.stamp_icon_image_url || null,
      freeRedemptionReached: stampCount >= stampsPerRedemption,
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
  const freeRedemptionReached = nextStampCount >= stampsPerRedemption;

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
