-- Add DELETE policies for merchants (business app reset) and customers (card deletion)

-- Merchants can DELETE loyalty cards for their store
DROP POLICY IF EXISTS loyalty_cards_merchant_delete ON loyalty_cards;
CREATE POLICY loyalty_cards_merchant_delete ON loyalty_cards
  FOR DELETE USING (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

-- Merchants can INSERT loyalty cards (needed for creating cards on scan)
DROP POLICY IF EXISTS loyalty_cards_merchant_insert ON loyalty_cards;
CREATE POLICY loyalty_cards_merchant_insert ON loyalty_cards
  FOR INSERT WITH CHECK (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

-- Merchants can DELETE transactions for their store
DROP POLICY IF EXISTS transactions_merchant_delete ON transactions;
CREATE POLICY transactions_merchant_delete ON transactions
  FOR DELETE USING (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

-- Merchants can INSERT transactions
DROP POLICY IF EXISTS transactions_merchant_insert ON transactions;
CREATE POLICY transactions_merchant_insert ON transactions
  FOR INSERT WITH CHECK (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

-- Merchants can DELETE redeemed rewards for their store
DROP POLICY IF EXISTS redeemed_rewards_merchant_delete ON redeemed_rewards;
CREATE POLICY redeemed_rewards_merchant_delete ON redeemed_rewards
  FOR DELETE USING (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

-- Merchants can INSERT redeemed rewards
DROP POLICY IF EXISTS redeemed_rewards_merchant_insert ON redeemed_rewards;
CREATE POLICY redeemed_rewards_merchant_insert ON redeemed_rewards
  FOR INSERT WITH CHECK (
    merchant_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );

-- Customers can DELETE their own loyalty cards
DROP POLICY IF EXISTS loyalty_cards_customer_delete ON loyalty_cards;
CREATE POLICY loyalty_cards_customer_delete ON loyalty_cards
  FOR DELETE USING (
    customer_id = (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

-- Customers can DELETE their own stamps
DROP POLICY IF EXISTS stamps_customer_delete ON stamps;
CREATE POLICY stamps_customer_delete ON stamps
  FOR DELETE USING (
    customer_id = (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

-- Customers can DELETE their own transactions
DROP POLICY IF EXISTS transactions_customer_delete ON transactions;
CREATE POLICY transactions_customer_delete ON transactions
  FOR DELETE USING (
    customer_id = (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

-- Customers can DELETE their own redeemed rewards
DROP POLICY IF EXISTS redeemed_rewards_customer_delete ON redeemed_rewards;
CREATE POLICY redeemed_rewards_customer_delete ON redeemed_rewards
  FOR DELETE USING (
    customer_id = (SELECT id FROM customers WHERE auth_id = auth.uid())
  );
