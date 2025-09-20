-- Create function to get all businesses for public consumption (bypasses RLS)
CREATE OR REPLACE FUNCTION get_all_businesses_public()
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  description TEXT,
  location TEXT,
  website TEXT,
  profile_picture_url TEXT,
  ens_domain TEXT,
  smart_contract_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Return all businesses with deployed contracts for public viewing
  RETURN QUERY
  SELECT 
    b.id,
    b.business_name,
    b.description,
    b.location,
    b.website,
    b.profile_picture_url,
    b.ens_domain,
    b.smart_contract_address,
    b.created_at
  FROM businesses b
  WHERE b.smart_contract_address IS NOT NULL
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION get_all_businesses_public() TO anon, authenticated;