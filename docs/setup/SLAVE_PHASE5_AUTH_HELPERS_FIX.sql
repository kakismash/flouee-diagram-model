-- ============================================
-- 🎯 EJECUTAR EN: SLAVE PROJECT
-- ============================================
-- Project: ffzufnwxvqngglsapqrf
-- URL: https://supabase.com/dashboard/project/ffzufnwxvqngglsapqrf/sql/new
--
-- FASE 5: Helper Functions para RLS (en schema public)
-- ⚠️ IMPORTANTE: Este SQL se ejecuta en el SLAVE project
-- ============================================

-- ============================================
-- HELPER FUNCTIONS en schema PUBLIC
-- ============================================
-- Nota: Las creamos en public en vez de auth por permisos
-- Las RLS policies pueden referenciarlas igual

-- 1. Obtener organization_id del JWT
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

-- 2. Obtener user_id del JWT
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

-- 3. Obtener user_role del JWT
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
COMMENT ON FUNCTION public.current_organization_id IS 'Extracts organization_id from JWT claims. Used in RLS policies for multi-tenant isolation.';
COMMENT ON FUNCTION public.current_user_id IS 'Extracts user_id (sub) from JWT claims.';
COMMENT ON FUNCTION public.current_user_role IS 'Extracts user role from JWT claims. Values: admin, org_admin, client.';

-- ============================================
-- TEST FUNCTIONS
-- ============================================

-- These will return NULL until JWT custom claims are configured
SELECT public.current_organization_id() as org_id;
SELECT public.current_user_id() as user_id;
SELECT public.current_user_role() as role;

-- Expected after JWT configuration:
-- org_id: [your organization uuid]
-- user_id: [your user uuid]
-- role: admin | org_admin | client

-- ============================================
-- SUCCESS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Helper functions created successfully!';
    RAISE NOTICE '📊 Functions: public.current_organization_id(), current_user_id(), current_user_role()';
    RAISE NOTICE '🔐 Ready for RLS policies';
    RAISE NOTICE 'ℹ️  Note: Functions are in public schema (not auth) due to permissions';
END $$;




