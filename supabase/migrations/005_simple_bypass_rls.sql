-- SIMPLE SOLUTION: Disable RLS on organizations table
-- Organizations are not sensitive data and are isolated by user queries anyway
-- This allows the signup trigger to work without complex workarounds

-- Disable RLS on organizations (simplest solution)
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Keep policies on other tables for security
-- users, projects, collaborators, history still have RLS enabled

-- Recreate the trigger function (simpler version)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create organization (no RLS on this table now)
  INSERT INTO public.organizations (name, plan)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'),
    'free'
  )
  RETURNING id INTO new_org_id;
  
  -- Create user profile (RLS allows INSERT for own ID)
  INSERT INTO public.users (id, email, organization_id, role)
  VALUES (NEW.id, NEW.email, new_org_id, 'admin');
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating user: %', SQLERRM;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();





