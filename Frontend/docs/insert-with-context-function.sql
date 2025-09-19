-- Create function that sets RLS context and inserts business in single transaction
CREATE OR REPLACE FUNCTION insert_business_with_context(
  p_wallet_address text,
  p_business_name text,
  p_description text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_social_links jsonb DEFAULT '{}',
  p_is_token_issuer boolean DEFAULT false,
  p_token_contract_address text DEFAULT NULL,
  p_profile_picture_url text DEFAULT NULL,
  p_ens_domain text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  business_record businesses%ROWTYPE;
BEGIN
  -- Set the RLS context within this function's transaction
  PERFORM set_config('app.current_user_wallet', p_wallet_address, true);
  
  -- Insert the business record
  INSERT INTO businesses (
    wallet_address,
    business_name,
    description,
    location,
    website,
    social_links,
    is_token_issuer,
    token_contract_address,
    profile_picture_url,
    ens_domain
  ) VALUES (
    p_wallet_address,
    p_business_name,
    p_description,
    p_location,
    p_website,
    p_social_links,
    p_is_token_issuer,
    p_token_contract_address,
    p_profile_picture_url,
    p_ens_domain
  ) RETURNING * INTO business_record;
  
  -- Return the inserted record as JSON
  RETURN to_jsonb(business_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_business_with_context(text, text, text, text, text, jsonb, boolean, text, text, text) TO anon, authenticated;

-- Also restore the original RLS policy
DROP POLICY IF EXISTS "wallet_matches" ON businesses;
DROP POLICY IF EXISTS "businesses_insert_own" ON businesses;
DROP POLICY IF EXISTS "businesses_select_own" ON businesses;
DROP POLICY IF EXISTS "businesses_update_own" ON businesses;
DROP POLICY IF EXISTS "businesses_policy" ON businesses;

CREATE POLICY "businesses_policy" ON businesses
    FOR ALL 
    USING (wallet_address = current_setting('app.current_user_wallet', true))
    WITH CHECK (wallet_address = current_setting('app.current_user_wallet', true));