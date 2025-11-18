-- ============================================
-- 🎯 RUN IN: SLAVE PROJECT
-- ============================================
-- Project: ffzufnwxvqngglsapqrf
-- URL: https://supabase.com/dashboard/project/ffzufnwxvqngglsapqrf/sql/new
--
-- COMPLETE SLAVE SETUP
-- This SQL configures EVERYTHING needed in the Slave
-- ============================================

-- ============================================
-- 1. EXEC_SQL FUNCTION
-- ============================================
-- Allows executing dynamic SQL from Edge Functions

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
  RETURN 'SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'exec_sql error: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.exec_sql IS 'Executes dynamic SQL. Used by Edge Functions to apply schema changes. SECURITY DEFINER allows bypassing RLS.';

-- Grant to service_role
GRANT EXECUTE ON FUNCTION public.exec_sql TO service_role;

-- ============================================
-- 2. HELPER FUNCTIONS FOR JWT
-- ============================================

-- Get organization_id from JWT
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'organization_id',
    ''
  )::uuid;
$$;

-- Get user_id from JWT
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::uuid;
$$;

-- Get user_role from JWT
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'user_role',
    ''
  )::text;
$$;

-- Comments
COMMENT ON FUNCTION public.current_organization_id IS 'Extracts organization_id from JWT claims. Used in RLS policies.';
COMMENT ON FUNCTION public.current_user_id IS 'Extracts user_id from JWT claims.';
COMMENT ON FUNCTION public.current_user_role IS 'Extracts user role from JWT claims. Values: admin, org_admin, client.';

-- ============================================
-- 3. VERIFICATION
-- ============================================

-- Verify that functions exist
SELECT 
  routine_name,
  routine_schema
FROM information_schema.routines
WHERE routine_name IN ('exec_sql', 'current_organization_id', 'current_user_id', 'current_user_role')
AND routine_schema = 'public'
ORDER BY routine_name;

-- ============================================
-- 4. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ===================================';
    RAISE NOTICE '✅ SLAVE SETUP COMPLETED';
    RAISE NOTICE '✅ ===================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Functions created:';
    RAISE NOTICE '   1. public.exec_sql(query text)';
    RAISE NOTICE '   2. public.current_organization_id()';
    RAISE NOTICE '   3. public.current_user_id()';
    RAISE NOTICE '   4. public.current_user_role()';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Ready to:';
    RAISE NOTICE '   - Execute dynamic SQL from Edge Functions';
    RAISE NOTICE '   - Apply RLS policies';
    RAISE NOTICE '   - Validate JWT custom claims';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '   1. Configure JWT Custom Claims Hook in Master';
    RAISE NOTICE '   2. See: MASTER_CONFIGURE_JWT_HOOK.md';
    RAISE NOTICE '';
END $$;

