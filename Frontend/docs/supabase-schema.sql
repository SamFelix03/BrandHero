-- Supabase Database Schema for EzEarn Business Onboarding

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: businesses
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL UNIQUE,
    ens_domain TEXT,
    profile_picture_url TEXT,
    business_name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    website TEXT,
    social_links JSONB DEFAULT '{}',
    is_token_issuer BOOLEAN DEFAULT FALSE,
    token_contract_address TEXT,
    smart_contract_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: reward_templates (pre-defined hardcoded rewards)
CREATE TABLE reward_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('web2', 'web3', 'points')),
    reward_logic_slug TEXT NOT NULL,
    description TEXT,
    requires_token BOOLEAN DEFAULT FALSE,
    parameters JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: bounties_draft (before contract deployment)
CREATE TABLE bounties_draft (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    action_type TEXT,
    proof_type TEXT,
    goal TEXT,
    reward_type_id UUID REFERENCES reward_templates(id),
    max_claims INTEGER,
    auto_verify BOOLEAN DEFAULT FALSE,
    expiry_date TIMESTAMP WITH TIME ZONE,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: business_ai_log (AI interaction tracking)
CREATE TABLE business_ai_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    request_payload JSONB,
    response_bounties JSONB,
    agent_version TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_businesses_wallet_address ON businesses(wallet_address);
CREATE INDEX idx_businesses_smart_contract_address ON businesses(smart_contract_address);
CREATE INDEX idx_bounties_draft_business_id ON bounties_draft(business_id);
CREATE INDEX idx_business_ai_log_business_id ON business_ai_log(business_id);

-- Row Level Security (RLS)
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounties_draft ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_ai_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (businesses can only access their own data)
CREATE POLICY "Businesses can view own data" ON businesses
    FOR ALL USING (wallet_address = current_setting('app.current_user_wallet', true));

CREATE POLICY "Businesses can manage own bounties" ON bounties_draft
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE wallet_address = current_setting('app.current_user_wallet', true)
    ));

CREATE POLICY "Businesses can view own AI logs" ON business_ai_log
    FOR SELECT USING (business_id IN (
        SELECT id FROM businesses WHERE wallet_address = current_setting('app.current_user_wallet', true)
    ));

-- Insert initial reward templates
INSERT INTO reward_templates (name, reward_type, reward_logic_slug, description, requires_token, parameters) VALUES
-- Web2 Rewards (available to all)
('10% Discount Coupon', 'web2', 'discount_coupon', 'Percentage discount on next purchase', FALSE, '{"discount_percentage": 10}'),
('Free Product', 'web2', 'free_item', 'Complimentary item or service', FALSE, '{"item_type": "product"}'),
('Event Access', 'web2', 'event_ticket', 'Access to exclusive events', FALSE, '{"access_level": "standard"}'),
('Cashback Voucher', 'web2', 'cashback_code', 'Cash back on purchases', FALSE, '{"cashback_amount": 0}'),
('Receipt-to-Reward', 'web2', 'receipt_to_reward', 'Points for verified receipts', FALSE, '{"points_per_dollar": 1}'),
('Points Reward', 'points', 'points_reward', 'Platform points for engagement', FALSE, '{"points_amount": 100}'),

-- Web3 Rewards (token issuers only)
('Token Airdrop', 'web3', 'airdrop_token', 'Direct token transfer to user wallet', TRUE, '{"token_amount": 0}'),
('NFT Badge', 'web3', 'mint_nft', 'Mint commemorative NFT', TRUE, '{"nft_metadata": ""}'),
('Swap Bonus', 'web3', 'swap_bonus', 'Additional tokens on DEX swaps', TRUE, '{"bonus_percentage": 5}'),
('LP Yield Boost', 'web3', 'lp_boost', 'Enhanced yield for liquidity providers', TRUE, '{"boost_multiplier": 1.5}');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger for businesses table
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();