/*
  # Fix Function Search Path Security Issue
  
  This migration secures the update_updated_at_column function by setting
  an immutable search_path, preventing potential security vulnerabilities.
  
  Changes:
  1. Drop and recreate the update_updated_at_column function with secure search_path
  
  Security Notes:
  - Setting search_path to empty string prevents schema-based attacks
  - All object references must now be fully qualified or use pg_catalog
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recreate with secure search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '';

-- Recreate all triggers that use this function
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
