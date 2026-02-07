-- SPEC-POS-001: Online Orders System
-- Migration: Create online_orders table
-- Phase 1 MVP: Database Migrations

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create online_orders table
CREATE TABLE IF NOT EXISTS online_orders (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant: business_id for isolation
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Order identification
  order_number VARCHAR(20) UNIQUE NOT NULL,

  -- Customer (nullable for guest orders)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Guest info (when not registered)
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(50),

  -- Order details
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  tip DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,

  -- Scheduling
  pickup_time TIMESTAMPTZ NOT NULL,
  estimated_prep_time INTEGER DEFAULT 30,
  requested_time TIMESTAMPTZ,

  -- Status with CHECK constraint
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'cancelled')),
  cancellation_reason TEXT,

  -- Payment
  payment_method VARCHAR(20) DEFAULT 'on_arrival'
    CHECK (payment_method IN ('stripe', 'cash', 'card_terminal', 'on_arrival')),
  payment_status VARCHAR(20) DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  stripe_payment_intent_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),

  -- Notifications
  notification_method VARCHAR(20) DEFAULT 'email'
    CHECK (notification_method IN ('email', 'sms', 'telegram')),
  notification_sent BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,

  -- Notes
  customer_notes TEXT,
  staff_notes TEXT,
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  started_preparing_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_online_orders_business_id ON online_orders(business_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_user_id ON online_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_online_orders_status ON online_orders(business_id, status);
CREATE INDEX IF NOT EXISTS idx_online_orders_pickup_time ON online_orders(business_id, pickup_time);
CREATE INDEX IF NOT EXISTS idx_online_orders_created_at ON online_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_online_orders_order_number ON online_orders(order_number);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_online_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_online_orders_updated_at
  BEFORE UPDATE ON online_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_online_orders_updated_at();

-- Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number(p_business_id UUID, p_business_slug VARCHAR)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_sequence_num INTEGER;
  v_order_number VARCHAR(20);
BEGIN
  -- Get next sequence number for this business
  SELECT COALESCE(MAX(CAST(substring(order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO v_sequence_num
  FROM online_orders
  WHERE business_id = p_business_id;

  -- Format: KA-000001 or first 3 chars of slug + sequence
  v_order_number := UPPER(substring(p_business_slug FOR 3)) || '-' || LPAD(v_sequence_num::TEXT, 6, '0');

  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- Create order status history table
CREATE TABLE IF NOT EXISTS online_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON online_order_status_history(order_id);

-- Create trigger to log status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO online_order_status_history (order_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_order_status_change
  AFTER UPDATE OF status ON online_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

COMMENT ON TABLE online_orders IS 'Online orders for customer pickup with scheduled time';
COMMENT ON TABLE online_order_status_history IS 'Audit log for online order status changes';
