-- Create function to get business with RLS context
CREATE OR REPLACE FUNCTION get_business_with_context(p_wallet_address text)
RETURNS jsonb AS $$
DECLARE
  business_record businesses%ROWTYPE;
BEGIN
  -- Set the RLS context
  PERFORM set_config('app.current_user_wallet', p_wallet_address, true);
  
  -- Get the business record
  SELECT * INTO business_record 
  FROM businesses 
  WHERE wallet_address = p_wallet_address;
  
  -- Return the record as JSON (null if not found)
  IF business_record.id IS NOT NULL THEN
    RETURN to_jsonb(business_record);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_business_with_context(text) TO anon, authenticated;