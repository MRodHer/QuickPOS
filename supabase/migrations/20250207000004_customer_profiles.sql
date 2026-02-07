-- SPEC-POS-001: Online Orders System
-- Migration: Create customer_profiles and notification_logs tables
-- Phase 1 MVP: Database Migrations

-- Create customer_profiles table for optional registered customer features
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,

  -- Fitness goals
  fitness_goal VARCHAR(20)
    CHECK (fitness_goal IN ('lose_weight', 'gain_muscle', 'maintain', 'performance', 'general_health')),

  -- Daily targets
  daily_calorie_target INTEGER,
  daily_protein_target INTEGER,
  daily_carbs_target INTEGER,
  daily_fat_target INTEGER,

  -- Dietary preferences
  dietary_preferences TEXT[] DEFAULT '{}'::TEXT[],
  allergies TEXT[] DEFAULT '{}'::TEXT[],

  -- Notification preferences
  preferred_notification_method VARCHAR(20) DEFAULT 'email'
    CHECK (preferred_notification_method IN ('email', 'sms', 'telegram')),

  phone_number VARCHAR(50),
  telegram_chat_id VARCHAR(255),

  -- Favorites
  favorite_products UUID[] DEFAULT '{}'::UUID[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id, user_id),
  UNIQUE(business_id, customer_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_profiles_user ON customer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_customer ON customer_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_business_goal ON customer_profiles(business_id, fitness_goal);

-- Create trigger for updated_at
CREATE TRIGGER trigger_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_online_orders_updated_at();

-- Add columns to customers table for online customer tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN stripe_customer_id VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'is_online_customer'
  ) THEN
    ALTER TABLE customers ADD COLUMN is_online_customer BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'last_online_order_at'
  ) THEN
    ALTER TABLE customers ADD COLUMN last_online_order_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Target
  order_id UUID REFERENCES online_orders(id) ON DELETE SET NULL,
  recipient VARCHAR(255) NOT NULL,

  -- Notification details
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'telegram')),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),

  -- Content
  subject VARCHAR(255),
  content TEXT,

  -- External IDs
  external_id VARCHAR(255),

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_business ON notification_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_order ON notification_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC);

COMMENT ON TABLE customer_profiles IS 'Optional customer profiles with fitness goals and preferences';
COMMENT ON TABLE notification_logs IS 'Log of all notifications sent for online orders';
