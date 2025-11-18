-- Migration: Capacity Monitoring and Auto-Scaling System
-- Creates tables and functions for monitoring slave project capacity
-- and triggering automatic provisioning when needed

-- ==================== CAPACITY HISTORY ====================
-- Tracks capacity usage over time for each slave project
CREATE TABLE IF NOT EXISTS capacity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_config_id UUID REFERENCES deployment_configs(id) ON DELETE CASCADE,
    
    -- Metrics at this point in time
    tables_used INTEGER NOT NULL DEFAULT 0,
    tables_allocated INTEGER NOT NULL DEFAULT 0,
    organizations_count INTEGER NOT NULL DEFAULT 0,
    capacity_percentage DECIMAL(5,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'full')),
    
    -- Metadata
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- ==================== PROVISIONING ALERTS ====================
-- Tracks alerts and provisioning requests
CREATE TABLE IF NOT EXISTS provisioning_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Alert details
    alert_type TEXT NOT NULL CHECK (alert_type IN ('capacity_warning', 'capacity_critical', 'provision_required')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'urgent')),
    
    message TEXT NOT NULL,
    details JSONB,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'ignored')),
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_capacity_history_deployment ON capacity_history(deployment_config_id);
CREATE INDEX IF NOT EXISTS idx_capacity_history_recorded_at ON capacity_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_capacity_history_status ON capacity_history(status);

CREATE INDEX IF NOT EXISTS idx_provisioning_alerts_status ON provisioning_alerts(status);
CREATE INDEX IF NOT EXISTS idx_provisioning_alerts_severity ON provisioning_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_provisioning_alerts_created_at ON provisioning_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provisioning_alerts_type ON provisioning_alerts(alert_type);

-- ==================== FUNCTIONS ====================

-- Calculate current capacity across all deployments
CREATE OR REPLACE FUNCTION calculate_current_capacity()
RETURNS TABLE (
    deployment_id UUID,
    project_ref TEXT,
    organizations_count BIGINT,
    tables_allocated BIGINT,
    capacity_percentage DECIMAL,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH org_allocations AS (
        SELECT 
            dc.id as deployment_id,
            dc.supabase_project_ref as project_ref,
            COUNT(DISTINCT o.id) as org_count,
            COALESCE(SUM(o.max_tables_per_project * o.max_projects), 0) as allocated
        FROM deployment_configs dc
        LEFT JOIN organizations o ON dc.id = (
            -- This is simplified; in production you'd have a proper relationship
            SELECT id FROM deployment_configs WHERE status = 'active' LIMIT 1
        )
        WHERE dc.status = 'active'
        GROUP BY dc.id, dc.supabase_project_ref
    )
    SELECT 
        oa.deployment_id,
        oa.project_ref,
        oa.org_count,
        oa.allocated,
        ROUND((oa.allocated::DECIMAL / 1600.0 * 100), 2) as capacity_pct,
        CASE 
            WHEN (oa.allocated::DECIMAL / 1600.0 * 100) >= 100 THEN 'full'
            WHEN (oa.allocated::DECIMAL / 1600.0 * 100) >= 80 THEN 'critical'
            WHEN (oa.allocated::DECIMAL / 1600.0 * 100) >= 60 THEN 'warning'
            ELSE 'healthy'
        END as status
    FROM org_allocations oa;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get latest capacity report
CREATE OR REPLACE FUNCTION get_latest_capacity_report()
RETURNS TABLE (
    deployment_id UUID,
    project_ref TEXT,
    tables_allocated INTEGER,
    capacity_percentage DECIMAL,
    status TEXT,
    recorded_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (ch.deployment_config_id)
        ch.deployment_config_id,
        dc.supabase_project_ref,
        ch.tables_allocated,
        ch.capacity_percentage,
        ch.status,
        ch.recorded_at
    FROM capacity_history ch
    JOIN deployment_configs dc ON dc.id = ch.deployment_config_id
    WHERE dc.status = 'active'
    ORDER BY ch.deployment_config_id, ch.recorded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending alerts
CREATE OR REPLACE FUNCTION get_pending_alerts()
RETURNS TABLE (
    id UUID,
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    details JSONB,
    created_at TIMESTAMPTZ,
    age_hours DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.id,
        pa.alert_type,
        pa.severity,
        pa.message,
        pa.details,
        pa.created_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - pa.created_at)) / 3600, 2) as age_hours
    FROM provisioning_alerts pa
    WHERE pa.status = 'pending'
    ORDER BY 
        CASE pa.severity
            WHEN 'urgent' THEN 1
            WHEN 'critical' THEN 2
            WHEN 'warning' THEN 3
            ELSE 4
        END,
        pa.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== TRIGGERS ====================

-- Auto-update updated_at on provisioning_alerts
CREATE OR REPLACE FUNCTION update_provisioning_alert_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_provisioning_alert_updated_at ON provisioning_alerts;
CREATE TRIGGER trigger_provisioning_alert_updated_at
    BEFORE UPDATE ON provisioning_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_provisioning_alert_updated_at();

-- ==================== RLS POLICIES ====================
ALTER TABLE capacity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE provisioning_alerts ENABLE ROW LEVEL SECURITY;

-- Capacity history: Service role only (internal system data)
DROP POLICY IF EXISTS "Service role can manage capacity history" ON capacity_history;
CREATE POLICY "Service role can manage capacity history"
    ON capacity_history FOR ALL
    USING (auth.role() = 'service_role');

-- Provisioning alerts: Admins can view
DROP POLICY IF EXISTS "Admins can view provisioning alerts" ON provisioning_alerts;
CREATE POLICY "Admins can view provisioning alerts"
    ON provisioning_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_organizations
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

DROP POLICY IF EXISTS "Service role can manage provisioning alerts" ON provisioning_alerts;
CREATE POLICY "Service role can manage provisioning alerts"
    ON provisioning_alerts FOR ALL
    USING (auth.role() = 'service_role');

-- Admins can acknowledge/resolve alerts
DROP POLICY IF EXISTS "Admins can update provisioning alerts" ON provisioning_alerts;
CREATE POLICY "Admins can update provisioning alerts"
    ON provisioning_alerts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_organizations
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_organizations
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

-- ==================== COMMENTS ====================
COMMENT ON TABLE capacity_history IS 'Historical tracking of slave project capacity usage';
COMMENT ON TABLE provisioning_alerts IS 'Alerts for capacity warnings and provisioning requests';
COMMENT ON FUNCTION calculate_current_capacity() IS 'Calculates current capacity across all slave projects';
COMMENT ON FUNCTION get_latest_capacity_report() IS 'Returns the most recent capacity report for each deployment';
COMMENT ON FUNCTION get_pending_alerts() IS 'Returns all pending alerts ordered by severity';







