import { supabase } from '@/lib/supabase';

const CUSTOMER_QR_PREFIX = 'STAMPWORTH:';

export const getCurrentMerchantProfile = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError || new Error('No authenticated merchant user found') };
  }

  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (data) {
    return { data, error: null };
  }

  const { data: byEmail, error: byEmailError } = await supabase
    .from('merchants')
    .select('*')
    .eq('owner_email', user.email || '')
    .maybeSingle();

  return { data: byEmail, error: byEmailError };
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
