/*
  # Create Accounting Integrations Schema

  1. New Tables
    - `accounting_integrations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `provider` (text) - Integration provider (xero, quickbooks, myob)
      - `provider_id` (text) - Provider's user/tenant ID
      - `access_token` (text) - Encrypted OAuth access token
      - `refresh_token` (text) - Encrypted OAuth refresh token
      - `token_expires_at` (timestamptz) - When access token expires
      - `organization_name` (text) - Connected organization name
      - `organization_id` (text) - Connected organization ID
      - `status` (text) - Connection status (active, expired, disconnected)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `integration_sync_logs`
      - `id` (uuid, primary key)
      - `integration_id` (uuid, foreign key to accounting_integrations)
      - `user_id` (uuid, foreign key to auth.users)
      - `quote_id` (text) - Quote reference ID
      - `action` (text) - Action performed (create_invoice, sync_quote, etc)
      - `status` (text) - Sync status (success, failed, pending)
      - `error_message` (text) - Error message if failed
      - `synced_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own integrations
    - Only authenticated users can access integration data
*/

-- Create accounting_integrations table
CREATE TABLE IF NOT EXISTS accounting_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Create integration_sync_logs table
CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES accounting_integrations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quote_id text,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_sync_status CHECK (status IN ('success', 'failed', 'pending'))
);

-- Enable RLS
ALTER TABLE accounting_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounting_integrations
CREATE POLICY "Users can view own integrations"
  ON accounting_integrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON accounting_integrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON accounting_integrations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON accounting_integrations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for integration_sync_logs
CREATE POLICY "Users can view own sync logs"
  ON integration_sync_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync logs"
  ON integration_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounting_integrations_user_id ON accounting_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_integrations_provider ON accounting_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_integration_id ON integration_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_user_id ON integration_sync_logs(user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_accounting_integrations_updated_at
  BEFORE UPDATE ON accounting_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();