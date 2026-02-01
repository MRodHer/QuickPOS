-- Add api_key and secret_key columns to terminal_configs for Clip integration
-- Previous column api_key_encrypted can be kept for backwards compatibility

ALTER TABLE terminal_configs
ADD COLUMN IF NOT EXISTS api_key TEXT,
ADD COLUMN IF NOT EXISTS secret_key TEXT;

-- Add index for provider lookup
CREATE INDEX IF NOT EXISTS idx_terminal_configs_provider ON terminal_configs(business_id, provider);

-- Update sale_status enum to include pending_payment for Clip links
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_payment' AND enumtypid = 'sale_status'::regtype) THEN
        ALTER TYPE sale_status ADD VALUE 'pending_payment';
    END IF;
END$$;
