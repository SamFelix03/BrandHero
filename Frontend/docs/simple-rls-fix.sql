-- Simple RLS policy - just check wallet_address matches

-- Drop existing policies
DROP POLICY IF EXISTS "Businesses can view own data" ON businesses;

-- Create simple policy
CREATE POLICY "wallet_matches" ON businesses
    FOR ALL 
    USING (wallet_address = current_setting('app.current_user_wallet', true))
    WITH CHECK (wallet_address = current_setting('app.current_user_wallet', true));