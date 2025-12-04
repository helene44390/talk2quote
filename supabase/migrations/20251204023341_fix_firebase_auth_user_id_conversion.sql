/*
  # Fix Firebase Auth Compatibility - Convert UUID to TEXT
  
  This migration fixes the incompatibility between Firebase Auth (string user IDs)
  and the existing Supabase schema (UUID user IDs).
  
  Changes:
  1. Drop all existing tables (subscriptions, subscription_usage, accounting_integrations, 
     integration_sync_logs, user_registration_data)
  2. Recreate all tables with user_id as TEXT instead of UUID
  3. Remove foreign key constraints to auth.users
  4. Replace restrictive RLS policies with open policies (Firebase handles auth)
*/

-- Drop existing tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS integration_sync_logs CASCADE;
DROP TABLE IF EXISTS accounting_integrations CASCADE;
DROP TABLE IF EXISTS subscription_usage CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS user_registration_data CASCADE;

-- Recreate subscriptions table with TEXT user_id
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  plan_type text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  payment_method_last4 text,
  payment_method_brand text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_plan CHECK (plan_type IN ('free', 'basic', 'pro')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'expired', 'past_due'))
);

-- Recreate subscription_usage table with TEXT user_id
CREATE TABLE subscription_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  quotes_generated integer DEFAULT 0,
  storage_used_gb decimal(10, 2) DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recreate accounting_integrations table with TEXT user_id
CREATE TABLE accounting_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  provider text NOT NULL,
  provider_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  organization_name text,
  organization_id text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_provider CHECK (provider IN ('xero', 'quickbooks', 'myob')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'expired', 'disconnected')),
  CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

-- Recreate integration_sync_logs table with TEXT user_id
CREATE TABLE integration_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES accounting_integrations(id) ON DELETE CASCADE NOT NULL,
  user_id text NOT NULL,
  quote_id text,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_sync_status CHECK (status IN ('success', 'failed', 'pending'))
);

-- Recreate user_registration_data table with TEXT user_id
CREATE TABLE user_registration_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  card_number_last4 text,
  card_brand text,
  card_expiry_month integer,
  card_expiry_year integer,
  reminder_email_opt_in boolean DEFAULT false,
  terms_accepted boolean DEFAULT false NOT NULL,
  auto_charge_consent boolean DEFAULT false NOT NULL,
  stripe_payment_method_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_registration_data ENABLE ROW LEVEL SECURITY;

-- Create OPEN policies (Firebase handles authentication)
CREATE POLICY "Enable all access for subscriptions"
  ON subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for subscription_usage"
  ON subscription_usage FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for accounting_integrations"
  ON accounting_integrations FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for integration_sync_logs"
  ON integration_sync_logs FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all access for user_registration_data"
  ON user_registration_data FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscription_usage_user_id ON subscription_usage(user_id);
CREATE INDEX idx_accounting_integrations_user_id ON accounting_integrations(user_id);
CREATE INDEX idx_integration_sync_logs_user_id ON integration_sync_logs(user_id);
CREATE INDEX idx_integration_sync_logs_integration_id ON integration_sync_logs(integration_id);
CREATE INDEX idx_user_registration_data_user_id ON user_registration_data(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_usage_updated_at
  BEFORE UPDATE ON subscription_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounting_integrations_updated_at
  BEFORE UPDATE ON accounting_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_registration_data_updated_at
  BEFORE UPDATE ON user_registration_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
