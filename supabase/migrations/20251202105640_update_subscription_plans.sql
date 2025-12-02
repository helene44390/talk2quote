/*
  # Update Subscription Plans

  1. Changes
    - Update plan_type constraint to use 'trial' instead of 'free' and 'basic'
    - New plan structure: 'trial' (10 free quotes) and 'pro' ($29/month unlimited)
    - Update default plan_type to 'trial'
    - Update existing 'free' and 'basic' subscriptions to 'trial'

  2. Notes
    - Maintains backward compatibility by migrating existing data
    - All users start with trial plan (10 free quotes)
*/

-- Drop the old constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS valid_plan;

-- Add new constraint with updated plan types
ALTER TABLE subscriptions ADD CONSTRAINT valid_plan CHECK (plan_type IN ('trial', 'pro'));

-- Update default value for new subscriptions
ALTER TABLE subscriptions ALTER COLUMN plan_type SET DEFAULT 'trial';

-- Migrate existing 'free' and 'basic' plans to 'trial'
UPDATE subscriptions 
SET plan_type = 'trial' 
WHERE plan_type IN ('free', 'basic');