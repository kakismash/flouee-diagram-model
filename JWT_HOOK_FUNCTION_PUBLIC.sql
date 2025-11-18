-- ============================================
-- 🎯 EJECUTAR EN: MASTER PROJECT (SQL Editor)
-- ============================================
-- Project: cwbywxaafncyplgsrblw
-- URL: https://supabase.com/dashboard/project/cwbywxaafncyplgsrblw/sql/new
--
-- FASE 5: JWT Hook Function (en schema public)
-- ⚠️ IMPORTANTE: Este SQL se ejecuta en el MASTER project
-- ============================================

-- ============================================
-- JWT HOOK FUNCTION en schema PUBLIC
-- ============================================
-- Nota: La creamos en public en vez de auth por permisos
-- El hook la puede referenciar igual

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  user_org_id uuid;
  user_role text;
BEGIN
  -- Get user's organization_id and role
  SELECT organization_id, role INTO user_org_id, user_role
  FROM public.users
  WHERE id = (event->>'user_id')::uuid;
  
  -- Add organization_id to JWT
  IF user_org_id IS NOT NULL THEN
    event := jsonb_set(
      event,
      '{claims,organization_id}',
      to_jsonb(user_org_id::text)
    );
  END IF;
  
  -- Add user_role to JWT
  IF user_role IS NOT NULL THEN
    event := jsonb_set(
      event,
      '{claims,user_role}',
      to_jsonb(user_role)
    );
  END IF;
  
  RETURN event;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Comment
COMMENT ON FUNCTION public.custom_access_token_hook IS 'Adds organization_id and user_role to JWT claims. Used by Auth Hook for multi-tenant isolation.';

-- ============================================
-- SUCCESS
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ JWT Hook function created successfully!';
    RAISE NOTICE '📊 Function: public.custom_access_token_hook()';
    RAISE NOTICE '🔐 Ready for Auth Hook configuration';
    RAISE NOTICE 'ℹ️  Note: Function is in public schema (not auth) due to permissions';
END $$;











