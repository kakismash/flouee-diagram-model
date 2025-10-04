-- Better approach: Create user profile on email confirmation
-- This way auth context is fully established

-- First, remove the old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new trigger function that runs on email confirmation
CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  user_exists BOOLEAN;
BEGIN
  -- Only proceed if email was just confirmed
  -- (email_confirmed_at changed from NULL to a timestamp)
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    
    -- Check if user profile already exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) INTO user_exists;
    
    IF NOT user_exists THEN
      -- Create organization
      INSERT INTO public.organizations (name, plan)
      VALUES (
        COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'),
        'free'
      )
      RETURNING id INTO new_org_id;
      
      -- Create user profile
      INSERT INTO public.users (id, email, organization_id, role)
      VALUES (NEW.id, NEW.email, new_org_id, 'admin');
      
      RAISE NOTICE 'Created user profile for % after email confirmation', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_email_confirmed for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on UPDATE (when email_confirmed_at changes)
CREATE TRIGGER on_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_email_confirmed();

-- For users who sign up WITHOUT email confirmation (if disabled in Supabase settings)
-- We still need a fallback trigger on INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user_no_confirmation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  user_exists BOOLEAN;
BEGIN
  -- Only run if email confirmation is disabled (email_confirmed_at is set immediately)
  IF NEW.email_confirmed_at IS NOT NULL THEN
    
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) INTO user_exists;
    
    IF NOT user_exists THEN
      INSERT INTO public.organizations (name, plan)
      VALUES (
        COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'),
        'free'
      )
      RETURNING id INTO new_org_id;
      
      INSERT INTO public.users (id, email, organization_id, role)
      VALUES (NEW.id, NEW.email, new_org_id, 'admin');
      
      RAISE NOTICE 'Created user profile for % (no email confirmation required)', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user_no_confirmation for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_no_confirmation
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  WHEN (NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_new_user_no_confirmation();

-- Now we can safely re-enable RLS on organizations and users
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Update policies to allow the trigger to work
-- Organizations: Allow INSERT for anyone (trigger uses SECURITY DEFINER)
DROP POLICY IF EXISTS "orgs_select" ON organizations;
DROP POLICY IF EXISTS "orgs_insert" ON organizations;
DROP POLICY IF EXISTS "orgs_update" ON organizations;

CREATE POLICY "orgs_select" ON organizations
  FOR SELECT 
  USING (id = public.current_user_org_id());

CREATE POLICY "orgs_insert" ON organizations
  FOR INSERT 
  WITH CHECK (true);  -- Allow trigger to insert

CREATE POLICY "orgs_update" ON organizations
  FOR UPDATE 
  USING (id = public.current_user_org_id());

-- Users: Similar approach
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;

CREATE POLICY "users_select" ON users
  FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "users_insert" ON users
  FOR INSERT 
  WITH CHECK (true);  -- Allow trigger to insert

CREATE POLICY "users_update" ON users
  FOR UPDATE 
  USING (id = auth.uid());
