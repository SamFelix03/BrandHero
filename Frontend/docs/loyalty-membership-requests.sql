-- Loyalty Program Membership Requests Table
-- This table manages consumer requests to join business loyalty programs

-- Table: loyalty_membership_requests
CREATE TABLE loyalty_membership_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    consumer_wallet_address TEXT NOT NULL,
    consumer_ens_name TEXT, -- Optional ENS name for the consumer
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT, -- Wallet address of business owner who reviewed
    rejection_reason TEXT, -- Optional reason for rejection
    consumer_message TEXT, -- Optional message from consumer when requesting
    
    -- Ensure one request per consumer per business
    UNIQUE(business_id, consumer_wallet_address)
);

-- Indexes for performance
CREATE INDEX idx_loyalty_requests_business_id ON loyalty_membership_requests(business_id);
CREATE INDEX idx_loyalty_requests_consumer_wallet ON loyalty_membership_requests(consumer_wallet_address);
CREATE INDEX idx_loyalty_requests_status ON loyalty_membership_requests(status);

-- Row Level Security
ALTER TABLE loyalty_membership_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Businesses can view and manage requests for their own loyalty programs
CREATE POLICY "Businesses can manage own loyalty requests" ON loyalty_membership_requests
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE wallet_address = current_setting('app.current_user_wallet', true)
    ));

-- Consumers can view their own requests
CREATE POLICY "Consumers can view own requests" ON loyalty_membership_requests
    FOR SELECT USING (consumer_wallet_address = current_setting('app.current_user_wallet', true));

-- Consumers can create new requests
CREATE POLICY "Consumers can create requests" ON loyalty_membership_requests
    FOR INSERT WITH CHECK (consumer_wallet_address = current_setting('app.current_user_wallet', true));

-- Function to get loyalty requests for a business (with RLS context)
CREATE OR REPLACE FUNCTION get_loyalty_requests_for_business(p_wallet_address TEXT)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    consumer_wallet_address TEXT,
    consumer_ens_name TEXT,
    status TEXT,
    requested_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by TEXT,
    rejection_reason TEXT,
    consumer_message TEXT
) AS $$
BEGIN
    -- Set RLS context
    PERFORM set_config('app.current_user_wallet', p_wallet_address, true);
    
    RETURN QUERY
    SELECT 
        r.id, r.business_id, r.consumer_wallet_address, r.consumer_ens_name,
        r.status, r.requested_at, r.reviewed_at, r.reviewed_by, 
        r.rejection_reason, r.consumer_message
    FROM loyalty_membership_requests r
    INNER JOIN businesses b ON r.business_id = b.id
    WHERE b.wallet_address = p_wallet_address
    ORDER BY r.requested_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get consumer's requests (with RLS context)  
CREATE OR REPLACE FUNCTION get_consumer_loyalty_requests(p_wallet_address TEXT)
RETURNS TABLE (
    id UUID,
    business_id UUID,
    business_name TEXT,
    business_ens_domain TEXT,
    status TEXT,
    requested_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    consumer_message TEXT
) AS $$
BEGIN
    -- Set RLS context
    PERFORM set_config('app.current_user_wallet', p_wallet_address, true);
    
    RETURN QUERY
    SELECT 
        r.id, r.business_id, b.business_name, b.ens_domain,
        r.status, r.requested_at, r.reviewed_at, 
        r.rejection_reason, r.consumer_message
    FROM loyalty_membership_requests r
    INNER JOIN businesses b ON r.business_id = b.id
    WHERE r.consumer_wallet_address = p_wallet_address
    ORDER BY r.requested_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a loyalty membership request (with RLS context)
CREATE OR REPLACE FUNCTION create_loyalty_request(
    p_consumer_wallet_address TEXT,
    p_business_id UUID,
    p_consumer_ens_name TEXT DEFAULT NULL,
    p_consumer_message TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    status TEXT,
    requested_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    request_id UUID;
    request_status TEXT := 'pending';
    request_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Set RLS context
    PERFORM set_config('app.current_user_wallet', p_consumer_wallet_address, true);
    
    -- Insert the request
    INSERT INTO loyalty_membership_requests (
        business_id, 
        consumer_wallet_address, 
        consumer_ens_name, 
        consumer_message,
        status,
        requested_at
    ) VALUES (
        p_business_id, 
        p_consumer_wallet_address, 
        p_consumer_ens_name, 
        p_consumer_message,
        request_status,
        request_time
    ) RETURNING loyalty_membership_requests.id INTO request_id;
    
    RETURN QUERY
    SELECT request_id, request_status, request_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update loyalty request status (business owner only)
CREATE OR REPLACE FUNCTION update_loyalty_request_status(
    p_business_wallet_address TEXT,
    p_request_id UUID,
    p_new_status TEXT,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    business_owns_request BOOLEAN := FALSE;
BEGIN
    -- Set RLS context for business
    PERFORM set_config('app.current_user_wallet', p_business_wallet_address, true);
    
    -- Verify business owns this request
    SELECT EXISTS (
        SELECT 1 FROM loyalty_membership_requests r
        INNER JOIN businesses b ON r.business_id = b.id
        WHERE r.id = p_request_id AND b.wallet_address = p_business_wallet_address
    ) INTO business_owns_request;
    
    IF NOT business_owns_request THEN
        RETURN QUERY SELECT FALSE, 'Request not found or access denied'::TEXT;
        RETURN;
    END IF;
    
    -- Validate status
    IF p_new_status NOT IN ('approved', 'rejected') THEN
        RETURN QUERY SELECT FALSE, 'Invalid status. Must be approved or rejected'::TEXT;
        RETURN;
    END IF;
    
    -- Update the request
    UPDATE loyalty_membership_requests 
    SET 
        status = p_new_status,
        reviewed_at = NOW(),
        reviewed_by = p_business_wallet_address,
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_rejection_reason ELSE NULL END
    WHERE id = p_request_id;
    
    RETURN QUERY SELECT TRUE, 'Request status updated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;