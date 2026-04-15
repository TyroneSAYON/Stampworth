-- Enable Supabase Realtime on all tables needed for live updates
-- Run this in the Supabase SQL Editor

-- Core tables for stamp operations (customer app realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE loyalty_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE stamps;
ALTER PUBLICATION supabase_realtime ADD TABLE redeemed_rewards;

-- Announcements (customer app notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE merchant_announcements;

-- Support messages (admin dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- Merchants & customers (admin dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE merchants;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;

-- Dev broadcasts (admin → both apps)
-- (already added in DEV_BROADCASTS_MIGRATION.sql, but safe to re-run)
-- ALTER PUBLICATION supabase_realtime ADD TABLE dev_broadcasts;
