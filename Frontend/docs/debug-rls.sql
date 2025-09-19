-- Debug RLS issue - run these queries in Supabase SQL Editor

-- 1. Check if the function exists
SELECT proname, proargnames, prosrc 
FROM pg_proc 
WHERE proname = 'set_user_context';

-- 2. Test the function manually
SELECT set_user_context('0x1234567890123456789012345678901234567890');

-- 3. Check current setting after function call
SELECT current_setting('app.current_user_wallet', true);

-- 4. View the current RLS policy
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'businesses';

-- 5. Test policy condition manually (replace with actual wallet address)
SELECT current_setting('app.current_user_wallet', true) = '0x1234567890123456789012345678901234567890';

-- 6. Temporarily disable RLS to test (ONLY for debugging - re-enable after)
-- ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;

-- 7. Alternative: Create a simpler RLS policy for testing
-- DROP POLICY IF EXISTS "Businesses can view own data" ON businesses;
-- CREATE POLICY "Allow all for testing" ON businesses FOR ALL USING (true);