-- SubTrakr's OWN billing — distinct from schema.sql, which models the
-- subscriptions a user *tracks* (Netflix, AWS, etc). This models what plan
-- a user pays *Akshara Technologies* for, and the settings the super admin
-- manages. Payment gateway: Razorpay (India-first — Stripe can't cleanly
-- accept domestic INR payments from Indian customers).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Admin access ─────────────────────────────────────────────────────────
-- Who can log into the super admin dashboard. Deliberately has NO RLS
-- policy for `authenticated` — only service_role (used server-side by the
-- Next.js admin backend, never exposed to a browser) can read/write this,
-- which is exactly how admin-gating should work: the check itself must not
-- be client-readable.
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('super_admin', 'support', 'finance')) DEFAULT 'super_admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- No policies — service_role only, by design.

-- ── App settings (Razorpay keys, SMTP, etc.) ────────────────────────────
-- Same access model as admin_users: service_role only. Secrets are
-- encrypted with pgcrypto using a key that lives ONLY in the Next.js
-- server's own environment (never in this database, never in git) — so
-- even someone with raw DB access can't read a secret's plaintext without
-- also having that separate encryption key.
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,                    -- plaintext, for non-secret settings
  encrypted_value BYTEA,         -- pgp_sym_encrypt'd, for secrets
  is_secret BOOLEAN DEFAULT FALSE,
  description TEXT,
  updated_by UUID REFERENCES auth.users,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
-- No policies — service_role only, by design.

-- ── Plans (Free / Pro / Team) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,             -- 'free', 'pro', 'team'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  currency TEXT DEFAULT 'INR',
  max_entities INTEGER,                  -- NULL = unlimited
  max_subscriptions INTEGER,              -- NULL = unlimited
  features JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
-- Plans are public info (pricing page needs them) — readable by anyone,
-- writable only by service_role (admin UI).
DO $$ BEGIN
  CREATE POLICY "Anyone can view active plans" ON plans FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── A user's subscription to SubTrakr itself ────────────────────────────
CREATE TABLE IF NOT EXISTS subscriber_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  plan_id UUID REFERENCES plans NOT NULL,
  status TEXT CHECK (status IN ('active','trialing','past_due','cancelled','expired')) DEFAULT 'trialing',
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly','yearly')) DEFAULT 'monthly',
  razorpay_customer_id TEXT,
  razorpay_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subscriber_billing ENABLE ROW LEVEL SECURITY;
-- A user can see their own billing status (to show "You're on Pro" in the
-- app) but CANNOT write to it directly — writes only happen server-side,
-- driven by verified Razorpay webhooks. Otherwise a user could just set
-- their own row to 'active' and get Pro for free.
DO $$ BEGIN
  CREATE POLICY "Users view own billing" ON subscriber_billing FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Payment transaction log (SubTrakr's own revenue, not the user's
--    tracked-subscription payment_history table) ───────────────────────
CREATE TABLE IF NOT EXISTS billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  subscriber_billing_id UUID REFERENCES subscriber_billing,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT CHECK (status IN ('created','authorized','captured','failed','refunded')) NOT NULL,
  method TEXT,                   -- upi, card, netbanking, etc. (from Razorpay)
  raw_payload JSONB,              -- full webhook payload, for audit/debugging
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users view own transactions" ON billing_transactions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Grants ───────────────────────────────────────────────────────────────
-- authenticated gets read access where policies above allow it; write
-- access to plans/billing/settings/admin_users is service_role-only by
-- omission (no INSERT/UPDATE/DELETE policy exists for `authenticated`).
GRANT SELECT ON plans, subscriber_billing, billing_transactions TO authenticated;

-- Seed the default plans if they don't already exist.
INSERT INTO plans (code, name, description, price_monthly, price_yearly, max_entities, max_subscriptions, sort_order)
VALUES
  ('free', 'Free', 'Track up to 3 subscriptions on your personal entity.', 0, 0, 1, 3, 0),
  ('pro', 'Pro', 'Unlimited subscriptions, business entities, GST export, invoice vault.', 149, 1490, NULL, NULL, 1),
  ('team', 'Team', 'Everything in Pro, for your whole finance team.', 499, 4990, NULL, NULL, 2)
ON CONFLICT (code) DO NOTHING;
