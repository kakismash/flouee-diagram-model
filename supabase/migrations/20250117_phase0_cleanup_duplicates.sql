-- ============================================
-- 🎯 EJECUTAR EN: MASTER PROJECT
-- ============================================
-- Project: cwbywxaafncyplgsrblw
-- URL: https://supabase.com/dashboard/project/cwbywxaafncyplgsrblw/sql/new
--
-- Migration: Phase 0 - Cleanup Duplicate Tables
-- Created: 2025-01-17
-- Description: Remove duplicate/unused tables from Master project
--
-- ⚠️ IMPORTANTE: Este SQL se ejecuta en el MASTER project, NO en el slave
-- ============================================

-- ============================================
-- PHASE 0: CLEANUP
-- ============================================

-- 1. Drop project_collaborators (0 rows, will use Realtime Presence)
DROP TABLE IF EXISTS project_collaborators CASCADE;

-- 2. Drop project_metadata (0 rows, duplicated functionality with projects)
DROP TABLE IF EXISTS project_metadata CASCADE;

-- ============================================
-- VERIFY CLEANUP
-- ============================================

-- Show remaining tables
SELECT 
    t.table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns c
     WHERE c.table_name = t.table_name 
       AND c.table_schema = 'public') as column_count,
    pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::regclass)) as size
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

-- ============================================
-- EXPECTED RESULT
-- ============================================
-- Should show 8 tables:
-- ✅ capacity_history
-- ✅ deployment_configs
-- ✅ organizations
-- ✅ project_history
-- ✅ projects (main table with schema_data)
-- ✅ provisioning_alerts
-- ✅ subscription_history
-- ✅ users

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE projects IS 'Main projects table. schema_data contains the full diagram design. This is the source of truth for schema designs.';
COMMENT ON COLUMN projects.schema_data IS 'Complete schema design as JSON. Contains tables, columns, relationships, and metadata.';
COMMENT ON COLUMN projects.version IS 'Version number for optimistic locking. Incremented on each update.';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Phase 0 Cleanup completed successfully!';
    RAISE NOTICE '📊 Removed tables: project_collaborators, project_metadata';
    RAISE NOTICE '🎯 Architecture is now clean and ready for Phase 1';
    RAISE NOTICE '📋 Main table: projects (with schema_data)';
END $$;

