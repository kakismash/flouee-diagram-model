-- ============================================
-- 🎯 COPY AND PASTE INTO: Auth Hooks Dashboard
-- ============================================
-- URL: https://supabase.com/dashboard/project/cwbywxaafncyplgsrblw/auth/hooks
-- 
-- IMPORTANT: 
-- 1. Click on "Custom Access Token Hook"
-- 2. Toggle "Enable Hook"
-- 3. Paste this code in the editor
-- 4. Click "Save"
-- 5. Make sure the toggle is GREEN (enabled)
-- ============================================

CREATE OR REPLACE FUNCTION auth.custom_access_token_hook(event jsonb)
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







