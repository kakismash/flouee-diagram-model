-- ============================================
-- 🎯 EJECUTAR EN: SLAVE PROJECT
-- ============================================
-- Project: ffzufnwxvqngglsapqrf
-- URL: https://supabase.com/dashboard/project/ffzufnwxvqngglsapqrf/sql/new
--
-- FASE 5: Helper Functions para RLS
-- ⚠️ IMPORTANTE: Este SQL se ejecuta en el SLAVE project
-- ============================================

-- ============================================
-- HELPER FUNCTIONS para extraer info del JWT
-- ============================================

-- 1. Obtener organization_id del JWT
CREATE OR REPLACE FUNCTION auth.organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'organization_id',
    ''
  )::uuid;
$$;

-- 2. Obtener user_id del JWT
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::uuid;
$$;

-- 3. Obtener user_role del JWT
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'user_role',
    ''
  )::text;
$$;

-- Comments
COMMENT ON FUNCTION auth.organization_id IS 'Extracts organization_id from JWT claims. Used in RLS policies for multi-tenant isolation.';
COMMENT ON FUNCTION auth.user_id IS 'Extracts user_id (sub) from JWT claims.';
COMMENT ON FUNCTION auth.user_role IS 'Extracts user role from JWT claims. Values: admin, org_admin, client.';

-- ============================================
-- TEST FUNCTIONS
-- ============================================

-- These will return NULL until JWT custom claims are configured
-- After configuration, they will return actual values

SELECT auth.organization_id() as org_id;
SELECT auth.user_id() as user_id;
SELECT auth.user_role() as role;

-- Expected after JWT configuration:
-- org_id: [your organization uuid]
-- user_id: [your user uuid]
-- role: admin | org_admin | client

-- ============================================
-- SUCCESS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Auth helper functions created successfully!';
    RAISE NOTICE '📊 Functions: auth.organization_id(), auth.user_id(), auth.user_role()';
    RAISE NOTICE '🔐 Ready for RLS policies';
END $$;












