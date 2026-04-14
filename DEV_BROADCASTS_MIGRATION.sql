-- Dev Broadcasts: messages from admin/devs to all app users
CREATE TABLE IF NOT EXISTS dev_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT 'all' CHECK (target IN ('all', 'customers', 'merchants')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE dev_broadcasts;

-- RLS: everyone can read, only service role can insert/update
ALTER TABLE dev_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read broadcasts" ON dev_broadcasts
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage broadcasts" ON dev_broadcasts
  FOR ALL USING (auth.role() = 'service_role');
