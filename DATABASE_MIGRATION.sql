-- Stampworth Production-Safe Migration (Non-Destructive)
-- This script avoids DROP TABLE and keeps existing data.

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "earthdistance" CASCADE;

-- ============================================================================
-- TABLES (CREATE IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,
  email VARCHAR UNIQUE NOT NULL,
  username VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR,
  phone_number VARCHAR,
  avatar_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,
  owner_email VARCHAR UNIQUE NOT NULL,
  business_name VARCHAR NOT NULL,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR,
  postal_code VARCHAR,
  country VARCHAR,
  latitude FLOAT,
  longitude FLOAT,
  geofence_radius_meters INT DEFAULT 500,
  website_url VARCHAR,
  phone_number VARCHAR,
  logo_url VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  qr_code_value VARCHAR UNIQUE NOT NULL,
  qr_code_image_url VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchant_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  qr_code_value VARCHAR UNIQUE NOT NULL,
  qr_code_image_url VARCHAR,
  is_active BOOLEAN DEFAULT true,
  times_scanned INT DEFAULT 0,
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  stamp_count INT DEFAULT 0,
  total_stamps_earned INT DEFAULT 0,
  status VARCHAR DEFAULT 'ACTIVE',
  is_free_redemption BOOLEAN DEFAULT false,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stamp_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stamps_per_redemption INT DEFAULT 10,
  redemption_reward_description VARCHAR,
  promotion_text VARCHAR,
  promotion_active BOOLEAN DEFAULT false,
  promotion_start_date TIMESTAMP WITH TIME ZONE,
  promotion_end_date TIMESTAMP WITH TIME ZONE,
  stamp_color VARCHAR DEFAULT '#FF6B6B',
  card_color VARCHAR DEFAULT '#2F4366',
  stamp_icon_name VARCHAR DEFAULT 'star',
  stamp_icon_image_url VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchant_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stamps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  earned_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  loyalty_card_id UUID REFERENCES loyalty_cards(id) NOT NULL,
  transaction_type VARCHAR NOT NULL,
  stamp_count_after INT,
  notes VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS redeemed_rewards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loyalty_card_id UUID REFERENCES loyalty_cards(id) ON DELETE CASCADE NOT NULL,
  merchant_id UUID REFERENCES merchants(id) NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  stamps_used INT,
  reward_code VARCHAR UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  accuracy_meters INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE NOT NULL,
  visit_latitude FLOAT,
  visit_longitude FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- ALTER EXISTING TABLES (add any missing columns safely)
-- ============================================================================

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS website_url VARCHAR;

ALTER TABLE stamp_settings ADD COLUMN IF NOT EXISTS card_color VARCHAR DEFAULT '#2F4366';
ALTER TABLE stamp_settings ADD COLUMN IF NOT EXISTS stamp_icon_name VARCHAR DEFAULT 'star';
ALTER TABLE stamp_settings ADD COLUMN IF NOT EXISTS stamp_icon_image_url VARCHAR;

-- Ensure loyalty_cards uniqueness exists (customer_id, merchant_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_customer_merchant'
  ) THEN
    ALTER TABLE loyalty_cards
      ADD CONSTRAINT unique_customer_merchant UNIQUE (customer_id, merchant_id);
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_auth_id ON customers(auth_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_username ON customers(username);

CREATE INDEX IF NOT EXISTS idx_merchants_auth_id ON merchants(auth_id);
CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(owner_email);
CREATE INDEX IF NOT EXISTS idx_merchants_location ON merchants USING GIST (ll_to_earth(latitude, longitude));

CREATE INDEX IF NOT EXISTS idx_customer_qr_codes_customer_id ON customer_qr_codes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_qr_codes_qr_value ON customer_qr_codes(qr_code_value);

-- Keep only one active customer QR per customer for stable tracking.
WITH ranked_active_qr AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) AS row_num
  FROM customer_qr_codes
  WHERE is_active = true
)
UPDATE customer_qr_codes cq
SET is_active = false
FROM ranked_active_qr raq
WHERE cq.id = raq.id
  AND raq.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_customer_qr_codes_active_customer
  ON customer_qr_codes(customer_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_merchant_qr_codes_merchant_id ON merchant_qr_codes(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_qr_codes_qr_value ON merchant_qr_codes(qr_code_value);

CREATE INDEX IF NOT EXISTS idx_loyalty_cards_customer_id ON loyalty_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_merchant_id ON loyalty_cards(merchant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_status ON loyalty_cards(status);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_free_redemption ON loyalty_cards(is_free_redemption);

CREATE INDEX IF NOT EXISTS idx_stamp_settings_merchant_id ON stamp_settings(merchant_id);

CREATE INDEX IF NOT EXISTS idx_merchant_announcements_merchant_id ON merchant_announcements(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_announcements_is_active ON merchant_announcements(is_active);

CREATE INDEX IF NOT EXISTS idx_stamps_loyalty_card_id ON stamps(loyalty_card_id);
CREATE INDEX IF NOT EXISTS idx_stamps_merchant_id ON stamps(merchant_id);
CREATE INDEX IF NOT EXISTS idx_stamps_customer_id ON stamps(customer_id);
CREATE INDEX IF NOT EXISTS idx_stamps_is_valid ON stamps(is_valid);

CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_loyalty_card_id ON transactions(loyalty_card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_redeemed_rewards_loyalty_card_id ON redeemed_rewards(loyalty_card_id);
CREATE INDEX IF NOT EXISTS idx_redeemed_rewards_merchant_id ON redeemed_rewards(merchant_id);
CREATE INDEX IF NOT EXISTS idx_redeemed_rewards_customer_id ON redeemed_rewards(customer_id);
CREATE INDEX IF NOT EXISTS idx_redeemed_rewards_code ON redeemed_rewards(reward_code);
CREATE INDEX IF NOT EXISTS idx_redeemed_rewards_is_used ON redeemed_rewards(is_used);

CREATE INDEX IF NOT EXISTS idx_user_locations_customer_id ON user_locations(customer_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_location ON user_locations USING GIST (ll_to_earth(latitude, longitude));

CREATE INDEX IF NOT EXISTS idx_store_visits_customer_id ON store_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_merchant_id ON store_visits(merchant_id);

-- ============================================================================
-- TRIGGER FUNCTION + TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at') THEN
    CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_merchants_updated_at') THEN
    CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_customer_qr_codes_updated_at') THEN
    CREATE TRIGGER update_customer_qr_codes_updated_at BEFORE UPDATE ON customer_qr_codes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_merchant_qr_codes_updated_at') THEN
    CREATE TRIGGER update_merchant_qr_codes_updated_at BEFORE UPDATE ON merchant_qr_codes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_loyalty_cards_updated_at') THEN
    CREATE TRIGGER update_loyalty_cards_updated_at BEFORE UPDATE ON loyalty_cards
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_stamp_settings_updated_at') THEN
    CREATE TRIGGER update_stamp_settings_updated_at BEFORE UPDATE ON stamp_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_redeemed_rewards_updated_at') THEN
    CREATE TRIGGER update_redeemed_rewards_updated_at BEFORE UPDATE ON redeemed_rewards
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_merchant_announcements_updated_at') THEN
    CREATE TRIGGER update_merchant_announcements_updated_at BEFORE UPDATE ON merchant_announcements
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- RLS + POLICIES
-- ============================================================================

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeemed_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_announcements ENABLE ROW LEVEL SECURITY;

-- Recreate policies safely (keeps data intact)
DROP POLICY IF EXISTS customers_select_own ON customers;
CREATE POLICY customers_select_own ON customers
  FOR SELECT USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS customers_update_own ON customers;
CREATE POLICY customers_update_own ON customers
  FOR UPDATE USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS merchants_select_own ON merchants;
CREATE POLICY merchants_select_own ON merchants
  FOR SELECT USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS merchants_update_own ON merchants;
CREATE POLICY merchants_update_own ON merchants
  FOR UPDATE USING (auth.uid() = auth_id);

DROP POLICY IF EXISTS loyalty_cards_customer_view ON loyalty_cards;
CREATE POLICY loyalty_cards_customer_view ON loyalty_cards
  FOR SELECT USING (
    customer_id = (SELECT id FROM customers WHERE auth_id = auth.uid()) OR
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS loyalty_cards_merchant_operations ON loyalty_cards;
CREATE POLICY loyalty_cards_merchant_operations ON loyalty_cards
  FOR UPDATE USING (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS stamps_customer_view ON stamps;
CREATE POLICY stamps_customer_view ON stamps
  FOR SELECT USING (
    customer_id = (SELECT id FROM customers WHERE auth_id = auth.uid()) OR
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS stamps_merchant_manage ON stamps;
CREATE POLICY stamps_merchant_manage ON stamps
  FOR ALL USING (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS transactions_view ON transactions;
CREATE POLICY transactions_view ON transactions
  FOR SELECT USING (
    customer_id = (SELECT id FROM customers WHERE auth_id = auth.uid()) OR
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS redeemed_rewards_view ON redeemed_rewards;
CREATE POLICY redeemed_rewards_view ON redeemed_rewards
  FOR SELECT USING (
    customer_id = (SELECT id FROM customers WHERE auth_id = auth.uid()) OR
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS stamp_settings_view ON stamp_settings;
CREATE POLICY stamp_settings_view ON stamp_settings
  FOR SELECT USING (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid()) OR
    merchant_id IN (
      SELECT merchant_id FROM loyalty_cards
      WHERE customer_id = (SELECT id FROM customers WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS stamp_settings_manage ON stamp_settings;
CREATE POLICY stamp_settings_manage ON stamp_settings
  FOR ALL USING (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

DROP POLICY IF EXISTS merchant_announcements_view ON merchant_announcements;
CREATE POLICY merchant_announcements_view ON merchant_announcements
  FOR SELECT USING (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid()) OR
    merchant_id IN (
      SELECT merchant_id FROM loyalty_cards
      WHERE customer_id = (SELECT id FROM customers WHERE auth_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS merchant_announcements_manage ON merchant_announcements;
CREATE POLICY merchant_announcements_manage ON merchant_announcements
  FOR ALL USING (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

-- ============================================================================
-- STORAGE (CUSTOMER AVATARS)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-avatars',
  'customer-avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS customer_avatars_public_read ON storage.objects;
CREATE POLICY customer_avatars_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'customer-avatars');

DROP POLICY IF EXISTS customer_avatars_insert_own ON storage.objects;
CREATE POLICY customer_avatars_insert_own ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'customer-avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS customer_avatars_update_own ON storage.objects;
CREATE POLICY customer_avatars_update_own ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'customer-avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'customer-avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS customer_avatars_delete_own ON storage.objects;
CREATE POLICY customer_avatars_delete_own ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'customer-avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION find_nearby_merchants(
  customer_lat FLOAT,
  customer_lon FLOAT,
  max_distance_meters FLOAT DEFAULT 5000
)
RETURNS TABLE (
  merchant_id UUID,
  business_name VARCHAR,
  latitude FLOAT,
  longitude FLOAT,
  distance_meters FLOAT,
  geofence_radius_meters INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.business_name,
    m.latitude,
    m.longitude,
    CAST(earth_distance(
      ll_to_earth(customer_lat, customer_lon),
      ll_to_earth(m.latitude, m.longitude)
    ) * 1000 AS FLOAT) AS distance_meters,
    m.geofence_radius_meters
  FROM merchants m
  WHERE earth_distance(
    ll_to_earth(customer_lat, customer_lon),
    ll_to_earth(m.latitude, m.longitude)
  ) * 1000 < max_distance_meters
    AND m.is_active = true
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION find_nearby_customers(
  merchant_id_param UUID,
  max_distance_meters FLOAT DEFAULT 1000
)
RETURNS TABLE (
  customer_id UUID,
  full_name VARCHAR,
  latitude FLOAT,
  longitude FLOAT,
  distance_meters FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.full_name,
    ul.latitude,
    ul.longitude,
    CAST(earth_distance(
      ll_to_earth(ul.latitude, ul.longitude),
      ll_to_earth(m.latitude, m.longitude)
    ) * 1000 AS FLOAT) AS distance_meters
  FROM user_locations ul
  JOIN customers c ON ul.customer_id = c.id
  JOIN merchants m ON m.id = merchant_id_param
  WHERE earth_distance(
    ll_to_earth(ul.latitude, ul.longitude),
    ll_to_earth(m.latitude, m.longitude)
  ) * 1000 < max_distance_meters
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_customer_in_geofence(
  customer_id_param UUID,
  merchant_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  distance_meters FLOAT;
  geofence_radius FLOAT;
BEGIN
  SELECT
    CAST(earth_distance(
      ll_to_earth(ul.latitude, ul.longitude),
      ll_to_earth(m.latitude, m.longitude)
    ) * 1000 AS FLOAT),
    m.geofence_radius_meters
  INTO distance_meters, geofence_radius
  FROM user_locations ul
  JOIN merchants m ON m.id = merchant_id_param
  WHERE ul.customer_id = customer_id_param
  ORDER BY ul.created_at DESC
  LIMIT 1;

  IF distance_meters IS NULL THEN
    RETURN false;
  END IF;

  RETURN distance_meters <= geofence_radius;
END;
$$ LANGUAGE plpgsql;

-- Delete current authenticated customer account and associated data.
DROP FUNCTION IF EXISTS public.delete_my_customer_account();

CREATE OR REPLACE FUNCTION public.delete_my_customer_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  v_auth_id UUID;
  v_customer_id UUID;
BEGIN
  v_auth_id := auth.uid();

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE auth_id = v_auth_id
  LIMIT 1;

  IF v_customer_id IS NOT NULL THEN
    DELETE FROM public.transactions WHERE customer_id = v_customer_id;
    DELETE FROM public.redeemed_rewards WHERE customer_id = v_customer_id;
    DELETE FROM public.stamps WHERE customer_id = v_customer_id;
    DELETE FROM public.store_visits WHERE customer_id = v_customer_id;
    DELETE FROM public.user_locations WHERE customer_id = v_customer_id;
    DELETE FROM public.customer_qr_codes WHERE customer_id = v_customer_id;
    DELETE FROM public.loyalty_cards WHERE customer_id = v_customer_id;
    DELETE FROM public.customers WHERE id = v_customer_id;
  END IF;

  DELETE FROM storage.objects
  WHERE bucket_id = 'customer-avatars'
    AND (storage.foldername(name))[1] = v_auth_id::text;

  DELETE FROM auth.users WHERE id = v_auth_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_customer_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_customer_account() TO authenticated;

-- ============================================================================
-- AUTH USER SYNC (auth.users -> public.customers)
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := regexp_replace(split_part(COALESCE(NEW.email, 'customer'), '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'customer';
  END IF;

  final_username := lower(base_username || '_' || substr(NEW.id::text, 1, 8));

  INSERT INTO public.customers (
    auth_id,
    email,
    username,
    full_name,
    avatar_url
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    final_username,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (auth_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, customers.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, customers.avatar_url);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

COMMIT;

-- Sanity checks:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
-- SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
