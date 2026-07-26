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
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('super_admin', 'support', 'finance')) DEFAULT 'super_admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- No policies — service_role only, by design.

-- ── Phone verification challenges (verify-then-set-PIN signup) ─────────
-- A signup proves ownership of a phone number via a WhatsApp-delivered
-- code BEFORE the account is created — GoTrue's own phone signup is only
-- called afterward, with SMS auto-confirm, since we've already verified
-- the number ourselves. Only ever touched by the server (service_role) —
-- there's no user to scope this to yet at signup time.
CREATE TABLE IF NOT EXISTS phone_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_phone_otp_challenges_phone ON phone_otp_challenges(phone);
ALTER TABLE phone_otp_challenges ENABLE ROW LEVEL SECURITY;
-- No policies — service_role only, by design.

-- ── Renewal reminder send log ───────────────────────────────────────────
-- Idempotency guard for the daily WhatsApp renewal-reminder cron
-- (/api/cron/renewal-reminders, triggered by a scheduled GitHub Actions
-- workflow). Keyed on (subscription_id, next_due_date, offset_days) rather
-- than just (subscription_id, offset_days) — next_due_date is part of the
-- key so a resend correctly fires again next cycle instead of being
-- blocked forever by a row from the previous renewal.
CREATE TABLE IF NOT EXISTS renewal_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions ON DELETE CASCADE NOT NULL,
  next_due_date DATE NOT NULL,
  offset_days INTEGER NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (subscription_id, next_due_date, offset_days)
);
ALTER TABLE renewal_reminders_sent ENABLE ROW LEVEL SECURITY;
-- No policies — service_role only (the cron route runs server-side).

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
  updated_by UUID REFERENCES auth.users ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
-- No policies — service_role only, by design.

-- ── Plans (Free / Starter / Personal / Business Lite / Business) ────────
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,             -- 'free', 'starter', 'pro', 'business_lite', 'team'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_quarterly DECIMAL(10,2),
  price_half_yearly DECIMAL(10,2),
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
-- Retrofit for databases where `plans` already existed before this file
-- added these two columns — must run before the seed UPSERT below, which
-- writes to them. Safe to re-run every deploy.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_quarterly DECIMAL(10,2);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_half_yearly DECIMAL(10,2);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
-- Plans are public info (pricing page needs them) — readable by anyone,
-- writable only by service_role (admin UI).
DO $$ BEGIN
  CREATE POLICY "Anyone can view active plans" ON plans FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── A user's subscription to SubTrakr itself ────────────────────────────
CREATE TABLE IF NOT EXISTS subscriber_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id UUID REFERENCES plans NOT NULL,
  status TEXT CHECK (status IN ('active','trialing','past_due','cancelled','expired')) DEFAULT 'trialing',
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly','quarterly','half_yearly','yearly')) DEFAULT 'monthly',
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
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  subscriber_billing_id UUID REFERENCES subscriber_billing ON DELETE CASCADE,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT CHECK (status IN ('created','authorized','captured','failed','refunded')) NOT NULL,
  method TEXT,                   -- upi, card, netbanking, etc. (from Razorpay)
  plan_code TEXT,                -- what was actually bought at the time — the
                                  -- subscriber's plan can change later, so this
                                  -- can't be derived by joining subscriber_billing
  billing_cycle TEXT,             -- ditto, for the cycle (monthly/quarterly/...)
  raw_payload JSONB,              -- full webhook payload, for audit/debugging
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Retrofit for databases where `billing_transactions` already existed
-- before this file added these two columns — needed for the subscriber-
-- facing billing history table to show what was actually purchased.
ALTER TABLE billing_transactions ADD COLUMN IF NOT EXISTS plan_code TEXT;
ALTER TABLE billing_transactions ADD COLUMN IF NOT EXISTS billing_cycle TEXT;
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users view own transactions" ON billing_transactions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Grants ───────────────────────────────────────────────────────────────
-- authenticated gets read access where policies above allow it; write
-- access to plans/billing/settings/admin_users is service_role-only by
-- omission (no INSERT/UPDATE/DELETE policy exists for `authenticated`).
GRANT SELECT ON plans, subscriber_billing, billing_transactions TO authenticated;
-- The public landing page reads plans with the bare anon key (no session).
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON plans TO anon;

-- Seed/reprice the plans — 5 tiers now instead of 3. Codes 'free'/'pro'/
-- 'team' are kept as-is (not renamed) even though their display names
-- changed ("Pro" -> "Personal", "Team" -> "Business") so any existing
-- subscriber_billing.plan_id FK stays valid; 'starter' and 'business_lite'
-- are new rows filling the gap between them. DO UPDATE (not DO NOTHING)
-- because this is a real repricing that must actually apply to rows that
-- already exist in prod from the original 3-tier seed.
INSERT INTO plans (code, name, description, price_monthly, price_quarterly, price_half_yearly, price_yearly, max_entities, max_subscriptions, sort_order)
VALUES
  ('free', 'Free', 'Track up to 5 subscriptions on your personal entity.', 0, 0, 0, 0, 1, 5, 0),
  ('starter', 'Starter', 'Up to 10 subscriptions on your personal entity.', 29, 79, 139, 239, 1, 10, 1),
  ('pro', 'Personal', 'Unlimited subscriptions on your personal entity, GST export, invoice vault.', 49, 129, 229, 399, 1, NULL, 2),
  ('business_lite', 'Business Lite', 'Unlimited subscriptions across your personal entity plus 2 business entities.', 99, 259, 459, 799, 3, NULL, 3),
  ('team', 'Business', 'Unlimited subscriptions across your personal entity plus unlimited business entities.', 149, 389, 699, 1199, NULL, NULL, 4)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_quarterly = EXCLUDED.price_quarterly,
  price_half_yearly = EXCLUDED.price_half_yearly,
  price_yearly = EXCLUDED.price_yearly,
  max_entities = EXCLUDED.max_entities,
  max_subscriptions = EXCLUDED.max_subscriptions,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Bootstrap the owner as super admin. Each no-ops until that email has
-- actually signed up (auth.users row exists); promotes automatically on
-- the next deploy after signup. Idempotent via the user_id UNIQUE
-- constraint — safe if the admin_users row is ever wiped and this re-runs.
INSERT INTO admin_users (user_id, role)
SELECT id, 'super_admin' FROM auth.users WHERE email = 'savaliya.sagar07@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO admin_users (user_id, role)
SELECT id, 'super_admin' FROM auth.users WHERE email = 'savaliya.sagar@hotmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Retrofit ON DELETE CASCADE onto these FKs for databases where the tables
-- already existed before this file added it above — see the matching block
-- at the end of schema.sql for why (admin "delete account" was hitting a
-- bare FK violation instead of cascading). Safe to re-run every deploy.
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_user_id_fkey,
  ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE renewal_reminders_sent DROP CONSTRAINT IF EXISTS renewal_reminders_sent_subscription_id_fkey,
  ADD CONSTRAINT renewal_reminders_sent_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE;
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_updated_by_fkey,
  ADD CONSTRAINT app_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE subscriber_billing DROP CONSTRAINT IF EXISTS subscriber_billing_user_id_fkey,
  ADD CONSTRAINT subscriber_billing_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE billing_transactions DROP CONSTRAINT IF EXISTS billing_transactions_user_id_fkey,
  ADD CONSTRAINT billing_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE billing_transactions DROP CONSTRAINT IF EXISTS billing_transactions_subscriber_billing_id_fkey,
  ADD CONSTRAINT billing_transactions_subscriber_billing_id_fkey FOREIGN KEY (subscriber_billing_id) REFERENCES subscriber_billing(id) ON DELETE CASCADE;

-- Retrofit the wider billing_cycle CHECK (quarterly/half_yearly added
-- alongside the existing monthly/yearly) onto databases where the
-- constraint already existed with just the original two values.
ALTER TABLE subscriber_billing DROP CONSTRAINT IF EXISTS subscriber_billing_billing_cycle_check;
ALTER TABLE subscriber_billing ADD CONSTRAINT subscriber_billing_billing_cycle_check
  CHECK (billing_cycle IN ('monthly','quarterly','half_yearly','yearly'));
