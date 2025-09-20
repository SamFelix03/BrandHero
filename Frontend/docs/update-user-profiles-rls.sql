-- Update user profiles RLS to match business approach exactly

-- Drop existing policies
DROP POLICY IF EXISTS "public_read_user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "authenticated_insert_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "authenticated_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "authenticated_delete_own_profile" ON user_profiles;

-- Create the exact same policy structure as businesses
-- 1. Allow public read access to all user profiles (for discovery)
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