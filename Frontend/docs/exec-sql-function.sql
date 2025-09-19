-- Create function to execute raw SQL (be careful with this in production)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  EXECUTE sql INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon, authenticated;