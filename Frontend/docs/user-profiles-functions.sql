-- User Profile Functions for EzEarn

-- Function to insert user profile with RLS context
CREATE OR REPLACE FUNCTION insert_user_profile_with_context(
  p_wallet_address text,
  p_username text,
  p_display_name text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_profile_picture_url text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_social_links jsonb DEFAULT '{}'
)
RETURNS jsonb AS $$
DECLARE
  profile_record user_profiles%ROWTYPE;
BEGIN
  -- Set the RLS context within this function's transaction
  PERFORM set_config('app.current_user_wallet', p_wallet_address, true);
  
  -- Insert the profile record
  INSERT INTO user_profiles (
    wallet_address,
    username,
    display_name,
    bio,
    profile_picture_url,
    location,
    website,
    social_links
  ) VALUES (
    p_wallet_address,
    p_username,
    p_display_name,
    p_bio,
    p_profile_picture_url,
    p_location,
    p_website,
    p_social_links
  ) RETURNING * INTO profile_record;
  
  -- Return the inserted record as JSON
  RETURN to_jsonb(profile_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile with RLS context
CREATE OR REPLACE FUNCTION get_user_profile_with_context(p_wallet_address text)
RETURNS jsonb AS $$
DECLARE
  profile_record user_profiles%ROWTYPE;
BEGIN
  -- Set the RLS context
  PERFORM set_config('app.current_user_wallet', p_wallet_address, true);
  
  -- Get the profile record
  SELECT * INTO profile_record 
  FROM user_profiles 
  WHERE wallet_address = p_wallet_address;
  
  -- Return the record as JSON (null if not found)
  IF profile_record.id IS NOT NULL THEN
    RETURN to_jsonb(profile_record);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile with RLS context
CREATE OR REPLACE FUNCTION update_user_profile_with_context(
  p_wallet_address text,
  p_username text,
  p_display_name text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_profile_picture_url text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_social_links jsonb DEFAULT '{}'
)
RETURNS jsonb AS $$
DECLARE
  profile_record user_profiles%ROWTYPE;
BEGIN
  -- Set the RLS context within this function's transaction
  PERFORM set_config('app.current_user_wallet', p_wallet_address, true);
  
  -- Update the profile record
  UPDATE user_profiles SET
    username = p_username,
    display_name = p_display_name,
    bio = p_bio,
    profile_picture_url = p_profile_picture_url,
    location = p_location,
    website = p_website,
    social_links = p_social_links,
    updated_at = NOW()
  WHERE wallet_address = p_wallet_address
  RETURNING * INTO profile_record;
  
  -- Return the updated record as JSON
  RETURN to_jsonb(profile_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION insert_user_profile_with_context(text, text, text, text, text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_with_context(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile_with_context(text, text, text, text, text, text, text, jsonb) TO anon, authenticated;