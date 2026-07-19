-- SubTrakr database schema — PRD §5.3, completed with RLS policies for
-- every table (the PRD only sketched one example policy and missed
-- enabling RLS on payment_methods entirely; both gaps are filled below).
-- Safe to re-run: every statement either uses IF NOT EXISTS semantics or
-- is naturally idempotent, except CREATE TABLE/POLICY which will just
-- report "already exists" harmlessly if run twice against the same DB.

-- Entities (personal or company)
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('personal', 'company')) NOT NULL,
  gst_number TEXT,
  default_payment_method_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  label TEXT NOT NULL,
  type TEXT CHECK (type IN ('card', 'upi', 'netbanking', 'wallet')) NOT NULL,
  last_four TEXT,
  upi_id TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  entity_id UUID REFERENCES entities NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  billing_cycle TEXT CHECK (billing_cycle IN ('weekly','monthly','quarterly','half_yearly','yearly','custom')) NOT NULL,
  custom_cycle_days INTEGER,
  start_date DATE NOT NULL,
  next_due_date DATE NOT NULL,
  end_date DATE,
  trial_end_date DATE,
  status TEXT CHECK (status IN ('active','paused','cancelled','trial')) DEFAULT 'active',
  is_auto_debit BOOLEAN DEFAULT FALSE,
  payment_method_id UUID REFERENCES payment_methods,
  is_gst_applicable BOOLEAN DEFAULT FALSE,
  vendor_gstin TEXT,
  gst_rate DECIMAL(5,2),
  hsn_sac_code TEXT,
  website_url TEXT,
  remind_days_before INTEGER DEFAULT 3,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment History
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  paid_date DATE NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  source TEXT CHECK (source IN ('manual','sms_detected','auto')) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  payment_history_id UUID REFERENCES payment_history,
  invoice_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  invoice_number TEXT,
  file_url TEXT,
  file_name TEXT,
  is_gst_invoice BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security — every table needs this ON, or nobody (not even the
-- owning user) can read/write it once RLS is enabled anywhere in the DB.
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policies: a user can only ever see/edit their own rows.
DO $$ BEGIN
  CREATE POLICY "Users manage own entities" ON entities FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users manage own payment methods" ON payment_methods FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users manage own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users manage own payment history" ON payment_history FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users manage own invoices" ON invoices FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Let logged-in app users actually reach these tables (RLS above still
-- restricts to their own rows on top of this).
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON entities, payment_methods, subscriptions, payment_history, invoices TO authenticated;
