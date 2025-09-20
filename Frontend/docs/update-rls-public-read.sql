-- Update RLS policies to allow public read access for businesses
-- while keeping write operations protected by authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Businesses can view own data" ON businesses;
DROP POLICY IF EXISTS "businesses_policy" ON businesses;
DROP POLICY IF EXISTS "businesses_insert_own" ON businesses;
DROP POLICY IF EXISTS "businesses_select_own" ON businesses;
DROP POLICY IF EXISTS "businesses_update_own" ON businesses;

-- Create new policies

-- 1. Allow public read access to all businesses (for consumer discovery)
CREATE POLICY "public_read_businesses" ON businesses
    FOR SELECT
    USING (true);

-- 2. Allow authenticated users to insert their own business
CREATE POLICY "authenticated_insert_own_business" ON businesses
    FOR INSERT
    WITH CHECK (wallet_address = current_setting('app.current_user_wallet', true));

-- 3. Allow authenticated users to update their own business
CREATE POLICY "authenticated_update_own_business" ON businesses
    FOR UPDATE
    USING (wallet_address = current_setting('app.current_user_wallet', true))
    WITH CHECK (wallet_address = current_setting('app.current_user_wallet', true));

-- 4. Allow authenticated users to delete their own business (if needed)
CREATE POLICY "authenticated_delete_own_business" ON businesses
    FOR DELETE
    USING (wallet_address = current_setting('app.current_user_wallet', true));