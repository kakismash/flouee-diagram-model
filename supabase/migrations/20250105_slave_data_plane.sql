-- File: supabase/migrations/20250105_slave_data_plane.sql
-- ===========================================================
-- SLAVE PROJECT 1 - DATA PLANE (Shared for FREE/BASIC)
-- This database stores actual project data for multiple
-- organizations using RLS for isolation
-- 
-- ⚠️ IMPORTANTE: Este archivo debe ejecutarse en el proyecto SLAVE,
-- NO en el proyecto master
-- ===========================================================

-- ==================== HELPER FUNCTIONS ====================
CREATE OR REPLACE FUNCTION auth.organization_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'organization_id',
    NULL
  )::UUID
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    NULL
  )::UUID
$$ LANGUAGE SQL STABLE;

-- ==================== PROJECTS ====================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    schema_data JSONB DEFAULT '{}'::jsonb,
    version INTEGER DEFAULT 1,
    
    tables_count INTEGER DEFAULT 0,
    relationships_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    UNIQUE(organization_id, name)
);

-- ==================== TABLES ====================
CREATE TABLE IF NOT EXISTS tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    name TEXT NOT NULL,
    display_name TEXT,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(project_id, name)
);

-- ==================== COLUMNS ====================
CREATE TABLE IF NOT EXISTS columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    nullable BOOLEAN DEFAULT true,
    unique_constraint BOOLEAN DEFAULT false,
    primary_key BOOLEAN DEFAULT false,
    default_value TEXT,
    order_index INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(table_id, name)
);

-- ==================== RELATIONSHIPS ====================
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    name TEXT,
    from_table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    to_table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('one-to-one', 'one-to-many', 'many-to-many')),
    from_column TEXT NOT NULL,
    to_column TEXT NOT NULL,
    junction_table_name TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== TABLE VIEWS ====================
CREATE TABLE IF NOT EXISTS table_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    name TEXT NOT NULL,
    description TEXT,
    column_settings JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    UNIQUE(table_id, name)
);

-- ==================== PROJECT HISTORY ====================
CREATE TABLE IF NOT EXISTS project_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    version INTEGER NOT NULL,
    schema_data JSONB NOT NULL,
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_tables_project_id ON tables(project_id);
CREATE INDEX IF NOT EXISTS idx_tables_org_id ON tables(organization_id);
CREATE INDEX IF NOT EXISTS idx_columns_table_id ON columns(table_id);
CREATE INDEX IF NOT EXISTS idx_columns_org_id ON columns(organization_id);
CREATE INDEX IF NOT EXISTS idx_relationships_project_id ON relationships(project_id);
CREATE INDEX IF NOT EXISTS idx_relationships_org_id ON relationships(organization_id);
CREATE INDEX IF NOT EXISTS idx_table_views_table_id ON table_views(table_id);
CREATE INDEX IF NOT EXISTS idx_table_views_org_id ON table_views(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_history_project_id ON project_history(project_id);

-- ==================== TRIGGERS ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tables_updated_at ON tables;
CREATE TRIGGER update_tables_updated_at 
    BEFORE UPDATE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_table_views_updated_at ON table_views;
CREATE TRIGGER update_table_views_updated_at 
    BEFORE UPDATE ON table_views
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-populate organization_id
CREATE OR REPLACE FUNCTION auto_populate_org_id()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'tables' THEN
        NEW.organization_id := (SELECT organization_id FROM projects WHERE id = NEW.project_id);
    ELSIF TG_TABLE_NAME = 'columns' THEN
        NEW.organization_id := (SELECT organization_id FROM tables WHERE id = NEW.table_id);
    ELSIF TG_TABLE_NAME = 'relationships' THEN
        NEW.organization_id := (SELECT organization_id FROM projects WHERE id = NEW.project_id);
    ELSIF TG_TABLE_NAME = 'table_views' THEN
        NEW.organization_id := (SELECT organization_id FROM tables WHERE id = NEW.table_id);
    ELSIF TG_TABLE_NAME = 'project_history' THEN
        NEW.organization_id := (SELECT organization_id FROM projects WHERE id = NEW.project_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_populate_org_id_tables ON tables;
CREATE TRIGGER trigger_auto_populate_org_id_tables
    BEFORE INSERT ON tables
    FOR EACH ROW EXECUTE FUNCTION auto_populate_org_id();

DROP TRIGGER IF EXISTS trigger_auto_populate_org_id_columns ON columns;
CREATE TRIGGER trigger_auto_populate_org_id_columns
    BEFORE INSERT ON columns
    FOR EACH ROW EXECUTE FUNCTION auto_populate_org_id();

DROP TRIGGER IF EXISTS trigger_auto_populate_org_id_relationships ON relationships;
CREATE TRIGGER trigger_auto_populate_org_id_relationships
    BEFORE INSERT ON relationships
    FOR EACH ROW EXECUTE FUNCTION auto_populate_org_id();

DROP TRIGGER IF EXISTS trigger_auto_populate_org_id_table_views ON table_views;
CREATE TRIGGER trigger_auto_populate_org_id_table_views
    BEFORE INSERT ON table_views
    FOR EACH ROW EXECUTE FUNCTION auto_populate_org_id();

DROP TRIGGER IF EXISTS trigger_auto_populate_org_id_project_history ON project_history;
CREATE TRIGGER trigger_auto_populate_org_id_project_history
    BEFORE INSERT ON project_history
    FOR EACH ROW EXECUTE FUNCTION auto_populate_org_id();

-- Update project counters
CREATE OR REPLACE FUNCTION update_project_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'tables' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE projects SET tables_count = tables_count + 1 WHERE id = NEW.project_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE projects SET tables_count = tables_count - 1 WHERE id = OLD.project_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'relationships' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE projects SET relationships_count = relationships_count + 1 WHERE id = NEW.project_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE projects SET relationships_count = relationships_count - 1 WHERE id = OLD.project_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_table_count ON tables;
CREATE TRIGGER trigger_update_table_count
    AFTER INSERT OR DELETE ON tables
    FOR EACH ROW EXECUTE FUNCTION update_project_counters();

DROP TRIGGER IF EXISTS trigger_update_relationship_count ON relationships;
CREATE TRIGGER trigger_update_relationship_count
    AFTER INSERT OR DELETE ON relationships
    FOR EACH ROW EXECUTE FUNCTION update_project_counters();

-- ==================== RLS POLICIES ====================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_history ENABLE ROW LEVEL SECURITY;

-- Projects policies
DROP POLICY IF EXISTS "Users can view their organization's projects" ON projects;
CREATE POLICY "Users can view their organization's projects"
    ON projects FOR SELECT
    USING (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can create projects for their organization" ON projects;
CREATE POLICY "Users can create projects for their organization"
    ON projects FOR INSERT
    WITH CHECK (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can update their organization's projects" ON projects;
CREATE POLICY "Users can update their organization's projects"
    ON projects FOR UPDATE
    USING (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can delete their organization's projects" ON projects;
CREATE POLICY "Users can delete their organization's projects"
    ON projects FOR DELETE
    USING (organization_id = auth.organization_id());

-- Tables policies
DROP POLICY IF EXISTS "Users can view their organization's tables" ON tables;
CREATE POLICY "Users can view their organization's tables"
    ON tables FOR SELECT
    USING (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can create tables for their organization" ON tables;
CREATE POLICY "Users can create tables for their organization"
    ON tables FOR INSERT
    WITH CHECK (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can update their organization's tables" ON tables;
CREATE POLICY "Users can update their organization's tables"
    ON tables FOR UPDATE
    USING (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can delete their organization's tables" ON tables;
CREATE POLICY "Users can delete their organization's tables"
    ON tables FOR DELETE
    USING (organization_id = auth.organization_id());

-- Columns policies
DROP POLICY IF EXISTS "Users can view their organization's columns" ON columns;
CREATE POLICY "Users can view their organization's columns"
    ON columns FOR SELECT
    USING (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can create columns for their organization" ON columns;
CREATE POLICY "Users can create columns for their organization"
    ON columns FOR INSERT
    WITH CHECK (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can update their organization's columns" ON columns;
CREATE POLICY "Users can update their organization's columns"
    ON columns FOR UPDATE
    USING (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can delete their organization's columns" ON columns;
CREATE POLICY "Users can delete their organization's columns"
    ON columns FOR DELETE
    USING (organization_id = auth.organization_id());

-- Relationships policies
DROP POLICY IF EXISTS "Users can view their organization's relationships" ON relationships;
CREATE POLICY "Users can view their organization's relationships"
    ON relationships FOR SELECT
    USING (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can create relationships for their organization" ON relationships;
CREATE POLICY "Users can create relationships for their organization"
    ON relationships FOR INSERT
    WITH CHECK (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can update their organization's relationships" ON relationships;
CREATE POLICY "Users can update their organization's relationships"
    ON relationships FOR UPDATE
    USING (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can delete their organization's relationships" ON relationships;
CREATE POLICY "Users can delete their organization's relationships"
    ON relationships FOR DELETE
    USING (organization_id = auth.organization_id());

-- Table views policies
DROP POLICY IF EXISTS "Users can view their organization's table views" ON table_views;
CREATE POLICY "Users can view their organization's table views"
    ON table_views FOR SELECT
    USING (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can create table views for their organization" ON table_views;
CREATE POLICY "Users can create table views for their organization"
    ON table_views FOR INSERT
    WITH CHECK (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can update their organization's table views" ON table_views;
CREATE POLICY "Users can update their organization's table views"
    ON table_views FOR UPDATE
    USING (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can delete their organization's table views" ON table_views;
CREATE POLICY "Users can delete their organization's table views"
    ON table_views FOR DELETE
    USING (organization_id = auth.organization_id());

-- Project history policies
DROP POLICY IF EXISTS "Users can view their organization's project history" ON project_history;
CREATE POLICY "Users can view their organization's project history"
    ON project_history FOR SELECT
    USING (organization_id = auth.organization_id());

DROP POLICY IF EXISTS "Users can create project history for their organization" ON project_history;
CREATE POLICY "Users can create project history for their organization"
    ON project_history FOR INSERT
    WITH CHECK (organization_id = auth.organization_id());

COMMENT ON TABLE projects IS 'Stores actual project data. Isolated by organization_id via RLS.';
COMMENT ON TABLE tables IS 'Stores table definitions. organization_id denormalized for RLS performance.';
COMMENT ON TABLE columns IS 'Stores column definitions. organization_id denormalized for RLS performance.';


