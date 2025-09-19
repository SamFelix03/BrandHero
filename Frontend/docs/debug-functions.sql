-- Create helper function to check current setting
CREATE OR REPLACE FUNCTION current_setting(setting_name text)
RETURNS text AS $$
BEGIN
  RETURN current_setting(setting_name, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION current_setting(text) TO anon, authenticated;

-- Also ensure the set_user_context function exists
CREATE OR REPLACE FUNCTION set_user_context(wallet_address text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_wallet', wallet_address, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_user_context(text) TO anon, authenticated;