-- Create function to set user context for RLS (used by upload and other operations)
CREATE OR REPLACE FUNCTION set_user_context(wallet_address text)
RETURNS void AS $$
BEGIN
  -- Set the RLS context within this function's transaction
  PERFORM set_config('app.current_user_wallet', wallet_address, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_user_context(text) TO anon, authenticated;