-- Row Level Security (RLS) policies for multi-tenant isolation
-- This migration enables RLS and creates security policies

-- Enable Row Level Security on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_schemas ENABLE ROW LEVEL SECURITY;

-- Create helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() ->> 'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is tenant admin
CREATE OR REPLACE FUNCTION is_tenant_admin(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_users tu
        WHERE tu.user_id = auth.uid()
        AND tu.tenant_id = tenant_uuid
        AND tu.role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenants policies
CREATE POLICY "Users can view their own tenants" ON tenants
    FOR SELECT USING (
        id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can update their tenants" ON tenants
    FOR UPDATE USING (is_tenant_admin(id));

-- Users policies
CREATE POLICY "Users can view users in their tenants" ON users
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert users in their tenants" ON users
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can update users in their tenants" ON users
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Tenant users policies
CREATE POLICY "Users can view tenant_users in their tenants" ON tenant_users
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can manage tenant_users" ON tenant_users
    FOR ALL USING (is_tenant_admin(tenant_id));

-- Diagram tables policies
CREATE POLICY "Users can view diagram_tables in their tenants" ON diagram_tables
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert diagram_tables in their tenants" ON diagram_tables
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update diagram_tables in their tenants" ON diagram_tables
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete diagram_tables in their tenants" ON diagram_tables
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Diagram relationships policies
CREATE POLICY "Users can view diagram_relationships in their tenants" ON diagram_relationships
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert diagram_relationships in their tenants" ON diagram_relationships
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update diagram_relationships in their tenants" ON diagram_relationships
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete diagram_relationships in their tenants" ON diagram_relationships
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

-- Generated schemas policies
CREATE POLICY "Users can view generated_schemas in their tenants" ON generated_schemas
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert generated_schemas in their tenants" ON generated_schemas
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update generated_schemas in their tenants" ON generated_schemas
    FOR UPDATE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete generated_schemas in their tenants" ON generated_schemas
    FOR DELETE USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_users 
            WHERE user_id = auth.uid()
        )
    );

