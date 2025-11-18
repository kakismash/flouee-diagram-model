-- Migration: Create RPC function to get deployment config
-- Created: 2025-01-16
-- Description: Creates the get_deployment_config RPC function that DeploymentService needs

-- ============================================
-- CREATE get_deployment_config FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_deployment_config(p_organization_id UUID)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    supabase_project_ref TEXT,
    supabase_project_url TEXT,
    supabase_anon_key TEXT,
    schema_name TEXT,
    status TEXT,
    provisioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- First, try to get organization-specific deployment
    RETURN QUERY
    SELECT 
        dc.id,
        dc.organization_id,
        dc.supabase_project_ref,
        dc.supabase_project_url,
        dc.supabase_anon_key,
        dc.schema_name,
        dc.status,
        dc.provisioned_at,
        dc.created_at,
        dc.updated_at
    FROM deployment_configs dc
    WHERE dc.organization_id = p_organization_id
    LIMIT 1;
    
    -- If no organization-specific deployment found, return the shared one
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            dc.id,
            dc.organization_id,
            dc.supabase_project_ref,
            dc.supabase_project_url,
            dc.supabase_anon_key,
            dc.schema_name,
            dc.status,
            dc.provisioned_at,
            dc.created_at,
            dc.updated_at
        FROM deployment_configs dc
        WHERE dc.organization_id IS NULL
        LIMIT 1;
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_deployment_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_deployment_config(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION get_deployment_config IS 'Returns deployment configuration for an organization. Falls back to shared deployment if no org-specific config exists.';

-- ============================================
-- TEST THE FUNCTION
-- ============================================

-- Test with existing organizations
-- SELECT * FROM get_deployment_config('4305d406-42bd-42d1-883b-a1289d67bb0f'); -- The Most Wanted
-- SELECT * FROM get_deployment_config('72045c7f-f03a-4ad0-a4ab-f4f7e1d11348'); -- Test Organization

-- Test with non-existent org (should return shared deployment)
-- SELECT * FROM get_deployment_config('00000000-0000-0000-0000-000000000000');












