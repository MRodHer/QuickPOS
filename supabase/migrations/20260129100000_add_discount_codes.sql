-- Discount codes table
CREATE TABLE discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
    discount_value DECIMAL(10,2) NOT NULL, -- percentage (0-100) or fixed amount
    max_uses INTEGER NOT NULL DEFAULT 1, -- total number of times this code can be used
    times_used INTEGER NOT NULL DEFAULT 0,
    min_purchase DECIMAL(10,2) DEFAULT 0, -- minimum purchase amount to apply
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(business_id, code)
);

-- Index for quick lookups
CREATE INDEX idx_discount_codes_business ON discount_codes(business_id);
CREATE INDEX idx_discount_codes_code ON discount_codes(business_id, code);

-- Track discount usage in sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES discount_codes(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50);

-- RLS policies
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view discount codes of their business" ON discount_codes
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM business_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage discount codes of their business" ON discount_codes
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM business_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin', 'manager')
        )
    );
