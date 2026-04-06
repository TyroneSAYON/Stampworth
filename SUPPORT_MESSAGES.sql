-- Support messages from customer/business apps to admin

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_type VARCHAR NOT NULL CHECK (sender_type IN ('customer', 'merchant')),
  sender_id UUID,
  sender_email VARCHAR NOT NULL,
  sender_name VARCHAR,
  subject VARCHAR,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_replied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_created_at_idx ON support_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS support_messages_is_read_idx ON support_messages(is_read);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own messages
DROP POLICY IF EXISTS support_messages_insert ON support_messages;
CREATE POLICY support_messages_insert ON support_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Senders can view their own messages
DROP POLICY IF EXISTS support_messages_view_own ON support_messages;
CREATE POLICY support_messages_view_own ON support_messages
  FOR SELECT USING (
    sender_id = (SELECT id FROM customers WHERE auth_id = auth.uid()) OR
    sender_id = (SELECT id FROM merchants WHERE auth_id = auth.uid())
  );
