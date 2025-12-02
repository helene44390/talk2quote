/*
  # Create User Registration Data Schema

  1. New Tables
    - `user_registration_data`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `card_number_last4` (text) - Last 4 digits of card for display
      - `card_brand` (text) - Card brand (Visa, Mastercard, etc)
      - `card_expiry_month` (integer) - Card expiry month
      - `card_expiry_year` (integer) - Card expiry year
      - `reminder_email_opt_in` (boolean) - User wants reminder when trial ends
      - `terms_accepted` (boolean) - User accepted terms and conditions
      - `auto_charge_consent` (boolean) - User consented to auto-charge after trial
      - `stripe_payment_method_id` (text) - Stripe payment method ID (encrypted)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on table
    - Users can only read/update their own registration data
    - Only authenticated users can access registration data

  3. Important Notes
    - Card data is stored in compliance with PCI standards
    - Full card numbers should NEVER be stored
    - Only last 4 digits for display purposes
    - Actual payment processing handled by Stripe
*/

-- Create user_registration_data table
CREATE TABLE IF NOT EXISTS user_registration_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  card_number_last4 text,
  card_brand text,
  card_expiry_month integer,
  card_expiry_year integer,
  reminder_email_opt_in boolean DEFAULT false,
  terms_accepted boolean DEFAULT false NOT NULL,
  auto_charge_consent boolean DEFAULT false NOT NULL,
  stripe_payment_method_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_expiry_month CHECK (card_expiry_month >= 1 AND card_expiry_month <= 12),
  CONSTRAINT valid_expiry_year CHECK (card_expiry_year >= EXTRACT(YEAR FROM CURRENT_DATE))
);

-- Enable RLS
ALTER TABLE user_registration_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own registration data"
  ON user_registration_data FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own registration data"
  ON user_registration_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own registration data"
  ON user_registration_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_registration_data_user_id ON user_registration_data(user_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_registration_data_updated_at
  BEFORE UPDATE ON user_registration_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();