-- Create a function to set user context for RLS
CREATE OR REPLACE FUNCTION set_user_context(wallet_address text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_wallet', wallet_address, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION set_user_context(text) TO anon, authenticated;