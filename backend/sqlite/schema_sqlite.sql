-- SubTrakr SQLite Schema
-- Enables foreign keys pragma for SQLite
PRAGMA foreign_keys = ON;

-- Entities (personal or company)
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('personal', 'company')),
  gst_number TEXT,
  default_payment_method_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit_card', 'debit_card', 'upi', 'bank_transfer', 'wallet')),
  bank_name TEXT,
  card_network TEXT,
  last_four TEXT,
  upi_id TEXT,
  wallet_name TEXT,
  wallet_mobile TEXT,
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('weekly','monthly','quarterly','half_yearly','yearly','custom')),
  custom_cycle_days INTEGER,
  start_date TEXT NOT NULL,
  next_due_date TEXT NOT NULL,
  end_date TEXT,
  trial_end_date TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','trial')),
  is_auto_debit INTEGER DEFAULT 0,
  payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
  is_gst_applicable INTEGER DEFAULT 0,
  vendor_gstin TEXT,
  gst_rate REAL,
  hsn_sac_code TEXT,
  website_url TEXT,
  remind_days_before INTEGER DEFAULT 3,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment History
CREATE TABLE IF NOT EXISTS payment_history (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  paid_date TEXT NOT NULL,
  amount_paid REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','sms_detected','auto')),
  payment_method_id TEXT REFERENCES payment_methods(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  payment_history_id TEXT REFERENCES payment_history(id) ON DELETE SET NULL,
  invoice_date TEXT NOT NULL,
  amount REAL NOT NULL,
  invoice_number TEXT,
  file_url TEXT,
  file_name TEXT,
  is_gst_invoice INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('super_admin', 'support', 'finance')) DEFAULT 'super_admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App Settings
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  encrypted_value TEXT,
  is_secret INTEGER DEFAULT 0,
  description TEXT,
  updated_by TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly REAL,
  price_quarterly REAL,
  price_half_yearly REAL,
  price_yearly REAL,
  currency TEXT DEFAULT 'INR',
  max_entities INTEGER,
  max_subscriptions INTEGER,
  features TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscriber Billing
CREATE TABLE IF NOT EXISTS subscriber_billing (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT DEFAULT 'trialing',
  billing_cycle TEXT DEFAULT 'monthly',
  razorpay_customer_id TEXT,
  razorpay_subscription_id TEXT,
  current_period_start DATETIME,
  current_period_end DATETIME,
  cancel_at_period_end INTEGER DEFAULT 0,
  trial_ends_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Billing Transactions
CREATE TABLE IF NOT EXISTS billing_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'captured',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auth Users (Local development user persistence)
CREATE TABLE IF NOT EXISTS auth_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  full_name TEXT,
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Local OTP Codes
CREATE TABLE IF NOT EXISTS local_otps (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  code TEXT NOT NULL,
  full_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed default admin user & plans for local dev
INSERT OR IGNORE INTO admin_users (id, user_id, role) VALUES ('admin-1', '00000000-0000-0000-0000-000000000001', 'super_admin');
INSERT OR IGNORE INTO plans (id, code, name, price_monthly, is_active) VALUES ('plan-free', 'free', 'Free Plan', 0, 1);
INSERT OR IGNORE INTO plans (id, code, name, price_monthly, is_active) VALUES ('plan-1', 'pro', 'Pro Plan', 299, 1);

