-- User Profiles Schema for EzEarn Consumer Profiles

-- Table: user_profiles
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT,
    bio TEXT,
    profile_picture_url TEXT,
    location TEXT,
    website TEXT,
    social_links JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_profiles_wallet_address ON user_profiles(wallet_address);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Allow public read access to all user profiles (for business discovery)
CREATE POLICY "public_read_user_profiles" ON user_profiles
    FOR SELECT
    USING (true);

-- 2. Allow authenticated users to insert their own profile
CREATE POLICY "authenticated_insert_own_profile" ON user_profiles
    FOR INSERT
    WITH CHECK (wallet_address = current_setting('app.current_user_wallet', true));

-- 3. Allow authenticated users to update their own profile
CREATE POLICY "authenticated_update_own_profile" ON user_profiles
    FOR UPDATE
    USING (wallet_address = current_setting('app.current_user_wallet', true))
    WITH CHECK (wallet_address = current_setting('app.current_user_wallet', true));

-- 4. Allow authenticated users to delete their own profile (if needed)
CREATE POLICY "authenticated_delete_own_profile" ON user_profiles
    FOR DELETE
    USING (wallet_address = current_setting('app.current_user_wallet', true));

-- Function to automatically update updated_at timestamp
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();