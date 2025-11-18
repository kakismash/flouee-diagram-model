-- File: supabase/migrations/20250105_master_control_plane.sql
-- ===========================================================
-- MASTER PROJECT - CONTROL PLANE
-- This migration transforms the master project into a pure
-- control plane that only manages metadata and authentication
-- ===========================================================

-- ==================== ORGANIZATIONS ====================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    
    -- Contact info
    email TEXT,
    website TEXT,
    
    -- Subscription info
    subscription_tier TEXT NOT NULL DEFAULT 'free'
        CHECK (subscription_tier IN ('free', 'basic', 'premium')),
    subscription_status TEXT DEFAULT 'active'
        CHECK (subscription_status IN ('active', 'cancelled', 'suspended', 'trial')),
    trial_ends_at TIMESTAMPTZ,
    subscription_started_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Deployment strategy
    deployment_strategy TEXT NOT NULL DEFAULT 'shared_schema'
        CHECK (deployment_strategy IN ('shared_schema', 'dedicated_schema', 'dedicated_project')),
    
    -- Limits based on tier
    max_users INTEGER DEFAULT 3,
    max_projects INTEGER DEFAULT 1,
    max_tables_per_project INTEGER DEFAULT 5,
    max_relationships_per_project INTEGER DEFAULT 10,
    
    -- Current usage counters
    current_users INTEGER DEFAULT 0,
    current_projects INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ==================== DEPLOYMENT CONFIGS ====================
CREATE TABLE IF NOT EXISTS deployment_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Target project info
    supabase_project_ref TEXT NOT NULL,
    supabase_project_url TEXT NOT NULL,
    supabase_anon_key TEXT NOT NULL,
    
    -- For shared deployments
    schema_name TEXT,
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'migrating', 'inactive')),
    provisioned_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id)
);

-- ==================== USER ORGANIZATIONS ====================
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Role in the organization
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    
    -- Metadata
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, organization_id)
);

-- ==================== PROJECTS (Metadata Only) ====================
CREATE TABLE IF NOT EXISTS project_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Project info
    name TEXT NOT NULL,
    description TEXT,
    
    -- Version control
    version INTEGER DEFAULT 1,
    
    -- Where the actual data is stored
    deployment_config_id UUID REFERENCES deployment_configs(id),
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(organization_id, name)
);

-- ==================== SUBSCRIPTION HISTORY ====================
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    from_tier TEXT,
    to_tier TEXT NOT NULL,
    
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_tier ON organizations(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_deployment_configs_org_id ON deployment_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_metadata_org_id ON project_metadata(organization_id);

-- ==================== TRIGGERS ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_metadata_updated_at ON project_metadata;
CREATE TRIGGER update_project_metadata_updated_at 
    BEFORE UPDATE ON project_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update user count
CREATE OR REPLACE FUNCTION update_org_user_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE organizations 
        SET current_users = current_users + 1 
        WHERE id = NEW.organization_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE organizations 
        SET current_users = current_users - 1 
        WHERE id = OLD.organization_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_count ON user_organizations;
CREATE TRIGGER trigger_update_user_count
    AFTER INSERT OR DELETE ON user_organizations
    FOR EACH ROW EXECUTE FUNCTION update_org_user_count();

-- Update project count
CREATE OR REPLACE FUNCTION update_org_project_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE organizations 
        SET current_projects = current_projects + 1 
        WHERE id = NEW.organization_id;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status != 'active' AND OLD.status = 'active') THEN
        UPDATE organizations 
        SET current_projects = current_projects - 1 
        WHERE id = COALESCE(NEW.organization_id, OLD.organization_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_project_count ON project_metadata;
CREATE TRIGGER trigger_update_project_count
    AFTER INSERT OR UPDATE OR DELETE ON project_metadata
    FOR EACH ROW EXECUTE FUNCTION update_org_project_count();

-- ==================== HELPER FUNCTIONS ====================

-- Get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS TABLE (
    org_id UUID,
    org_name TEXT,
    org_slug TEXT,
    user_role TEXT,
    subscription_tier TEXT,
    deployment_strategy TEXT,
    max_users INTEGER,
    max_projects INTEGER,
    max_tables_per_project INTEGER,
    max_relationships_per_project INTEGER,
    current_users INTEGER,
    current_projects INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.slug,
        uo.role,
        o.subscription_tier,
        o.deployment_strategy,
        o.max_users,
        o.max_projects,
        o.max_tables_per_project,
        o.max_relationships_per_project,
        o.current_users,
        o.current_projects
    FROM organizations o
    JOIN user_organizations uo ON uo.organization_id = o.id
    WHERE uo.user_id = p_user_id
    ORDER BY uo.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get deployment config
CREATE OR REPLACE FUNCTION get_deployment_config(p_organization_id UUID)
RETURNS TABLE (
    project_ref TEXT,
    project_url TEXT,
    anon_key TEXT,
    schema_name TEXT,
    deployment_strategy TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.supabase_project_ref,
        dc.supabase_project_url,
        dc.supabase_anon_key,
        dc.schema_name,
        o.deployment_strategy
    FROM deployment_configs dc
    JOIN organizations o ON o.id = dc.organization_id
    WHERE dc.organization_id = p_organization_id
      AND dc.status = 'active'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can manage org
CREATE OR REPLACE FUNCTION user_can_manage_org(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_organizations
        WHERE user_id = p_user_id
          AND organization_id = p_org_id
          AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check resource limits
CREATE OR REPLACE FUNCTION check_organization_limits(
    p_org_id UUID,
    p_resource_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_org organizations%ROWTYPE;
BEGIN
    SELECT * INTO v_org FROM organizations WHERE id = p_org_id;
    
    IF p_resource_type = 'user' THEN
        RETURN v_org.current_users < v_org.max_users;
    ELSIF p_resource_type = 'project' THEN
        RETURN v_org.current_projects < v_org.max_projects;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== RLS POLICIES ====================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Organizations policies
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Owners and admins can update organizations" ON organizations;
CREATE POLICY "Owners and admins can update organizations"
    ON organizations FOR UPDATE
    USING (user_can_manage_org(auth.uid(), id));

-- Deployment configs policies
DROP POLICY IF EXISTS "Users can view their org's deployment config" ON deployment_configs;
CREATE POLICY "Users can view their org's deployment config"
    ON deployment_configs FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

-- User organizations policies
DROP POLICY IF EXISTS "Users can view their memberships" ON user_organizations;
CREATE POLICY "Users can view their memberships"
    ON user_organizations FOR SELECT
    USING (
        user_id = auth.uid() OR
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

-- Project metadata policies
DROP POLICY IF EXISTS "Users can view their org's projects" ON project_metadata;
CREATE POLICY "Users can view their org's projects"
    ON project_metadata FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create projects in their org" ON project_metadata;
CREATE POLICY "Users can create projects in their org"
    ON project_metadata FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin', 'editor')
        )
        AND check_organization_limits(organization_id, 'project')
    );

-- Subscription history policies
DROP POLICY IF EXISTS "Users can view their org's subscription history" ON subscription_history;
CREATE POLICY "Users can view their org's subscription history"
    ON subscription_history FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    );

COMMENT ON TABLE organizations IS 'Main tenant/client entity. Stores subscription and deployment info.';
COMMENT ON TABLE deployment_configs IS 'Maps organizations to their Supabase slave projects.';
COMMENT ON TABLE user_organizations IS 'Maps Supabase Auth users to organizations with roles.';
COMMENT ON TABLE project_metadata IS 'Metadata about projects. Actual data stored in slave projects.';


