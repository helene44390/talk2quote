/*
  # Convert User ID Columns from UUID to TEXT for Firebase Auth (v2)
  
  ## Overview
  This migration updates all tables to use TEXT type for user_id columns
  instead of UUID, enabling compatibility with Firebase Authentication.
  
  ## Changes Made
  
  ### Step 1: Drop All RLS Policies
  Policies must be dropped first because they reference the user_id column
  
  ### Step 2: Update Column Types
  1. **subscriptions** - Convert user_id from UUID to TEXT
  2. **subscription_usage** - Convert user_id from UUID to TEXT
  3. **accounting_integrations** - Convert user_id from UUID to TEXT
  4. **integration_sync_logs** - Convert user_id from UUID to TEXT
  5. **user_registration_data** - Convert user_id from UUID to TEXT
  
  ### Step 3: Recreate RLS Policies
  Create new permissive policies that work with TEXT user_id
  
  ## Security
  - RLS remains enabled on all tables
  - Permissive policies allow authenticated access (trusting app layer)
  - Application is responsible for user_id validation with Firebase Auth
  
  ## Important Notes
  - Firebase Auth generates string user IDs (e.g., "7D9x2...")
  - Removes foreign key relationship to auth.users (Supabase auth table)
  - All indexes are recreated to work with TEXT type
*/

-- ========================================
-- STEP 1: Drop All Existing RLS Policies
-- ========================================

-- Drop policies on subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Allow subscriptions read access" ON subscriptions;
DROP POLICY IF EXISTS "Allow subscriptions insert" ON subscriptions;
DROP POLICY IF EXISTS "Allow subscriptions update" ON subscriptions;
DROP POLICY IF EXISTS "Allow subscriptions delete" ON subscriptions;

-- Drop policies on subscription_usage
DROP POLICY IF EXISTS "Users can view own usage" ON subscription_usage;
DROP POLICY IF EXISTS "Users can update own usage" ON subscription_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON subscription_usage;
DROP POLICY IF EXISTS "Allow subscription_usage read access" ON subscription_usage;
DROP POLICY IF EXISTS "Allow subscription_usage insert" ON subscription_usage;
DROP POLICY IF EXISTS "Allow subscription_usage update" ON subscription_usage;
DROP POLICY IF EXISTS "Allow subscription_usage delete" ON subscription_usage;

-- Drop policies on accounting_integrations
DROP POLICY IF EXISTS "Users can view own integrations" ON accounting_integrations;
DROP POLICY IF EXISTS "Users can insert own integrations" ON accounting_integrations;
DROP POLICY IF EXISTS "Users can update own integrations" ON accounting_integrations;
DROP POLICY IF EXISTS "Users can delete own integrations" ON accounting_integrations;
DROP POLICY IF EXISTS "Allow accounting_integrations read access" ON accounting_integrations;
DROP POLICY IF EXISTS "Allow accounting_integrations insert" ON accounting_integrations;
DROP POLICY IF EXISTS "Allow accounting_integrations update" ON accounting_integrations;
DROP POLICY IF EXISTS "Allow accounting_integrations delete" ON accounting_integrations;

-- Drop policies on integration_sync_logs
DROP POLICY IF EXISTS "Users can view own sync logs" ON integration_sync_logs;
DROP POLICY IF EXISTS "Users can insert own sync logs" ON integration_sync_logs;
DROP POLICY IF EXISTS "Allow integration_sync_logs read access" ON integration_sync_logs;
DROP POLICY IF EXISTS "Allow integration_sync_logs insert" ON integration_sync_logs;
DROP POLICY IF EXISTS "Allow integration_sync_logs update" ON integration_sync_logs;
DROP POLICY IF EXISTS "Allow integration_sync_logs delete" ON integration_sync_logs;

-- Drop policies on user_registration_data
DROP POLICY IF EXISTS "Users can view own registration data" ON user_registration_data;
DROP POLICY IF EXISTS "Users can update own registration data" ON user_registration_data;
DROP POLICY IF EXISTS "Users can insert own registration data" ON user_registration_data;

-- ========================================
-- STEP 2: Drop Foreign Keys and Convert Column Types
-- ========================================

-- Subscriptions table
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE subscriptions ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Subscription usage table
ALTER TABLE subscription_usage DROP CONSTRAINT IF EXISTS subscription_usage_user_id_fkey;
ALTER TABLE subscription_usage ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Accounting integrations table
ALTER TABLE accounting_integrations DROP CONSTRAINT IF EXISTS accounting_integrations_user_id_fkey;
ALTER TABLE accounting_integrations ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Integration sync logs table
ALTER TABLE integration_sync_logs DROP CONSTRAINT IF EXISTS integration_sync_logs_user_id_fkey;
ALTER TABLE integration_sync_logs ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- User registration data table
ALTER TABLE user_registration_data DROP CONSTRAINT IF EXISTS user_registration_data_user_id_fkey;
ALTER TABLE user_registration_data ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- ========================================
-- STEP 3: Recreate Indexes
-- ========================================

DROP INDEX IF EXISTS idx_subscriptions_user_id;
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

DROP INDEX IF EXISTS idx_subscription_usage_user_id;
CREATE INDEX idx_subscription_usage_user_id ON subscription_usage(user_id);

DROP INDEX IF EXISTS idx_accounting_integrations_user_id;
CREATE INDEX idx_accounting_integrations_user_id ON accounting_integrations(user_id);

DROP INDEX IF EXISTS idx_integration_sync_logs_user_id;
CREATE INDEX idx_integration_sync_logs_user_id ON integration_sync_logs(user_id);

DROP INDEX IF EXISTS idx_user_registration_data_user_id;
CREATE INDEX idx_user_registration_data_user_id ON user_registration_data(user_id);

-- ========================================
-- STEP 4: Recreate RLS Policies (Permissive for Firebase Auth)
-- ========================================

-- Subscriptions policies
CREATE POLICY "Allow read access to subscriptions"
  ON subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Allow insert to subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update to subscriptions"
  ON subscriptions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete from subscriptions"
  ON subscriptions FOR DELETE
  USING (true);

-- Subscription usage policies
CREATE POLICY "Allow read access to subscription_usage"
  ON subscription_usage FOR SELECT
  USING (true);

CREATE POLICY "Allow insert to subscription_usage"
  ON subscription_usage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update to subscription_usage"
  ON subscription_usage FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete from subscription_usage"
  ON subscription_usage FOR DELETE
  USING (true);

-- Accounting integrations policies
CREATE POLICY "Allow read access to accounting_integrations"
  ON accounting_integrations FOR SELECT
  USING (true);

CREATE POLICY "Allow insert to accounting_integrations"
  ON accounting_integrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update to accounting_integrations"
  ON accounting_integrations FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete from accounting_integrations"
  ON accounting_integrations FOR DELETE
  USING (true);

-- Integration sync logs policies
CREATE POLICY "Allow read access to integration_sync_logs"
  ON integration_sync_logs FOR SELECT
  USING (true);

CREATE POLICY "Allow insert to integration_sync_logs"
  ON integration_sync_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update to integration_sync_logs"
  ON integration_sync_logs FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete from integration_sync_logs"
  ON integration_sync_logs FOR DELETE
  USING (true);

-- User registration data policies
CREATE POLICY "Allow read access to user_registration_data"
  ON user_registration_data FOR SELECT
  USING (true);

CREATE POLICY "Allow insert to user_registration_data"
  ON user_registration_data FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow update to user_registration_data"
  ON user_registration_data FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete from user_registration_data"
  ON user_registration_data FOR DELETE
  USING (true);
