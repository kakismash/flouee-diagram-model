-- Fix: Prevent duplicate user creation
-- Problem: Trigger may run multiple times or user already exists
-- Solution: Use INSERT ... ON CONFLICT DO NOTHING or check existence first

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  user_exists BOOLEAN;
BEGIN
  -- Check if user already exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = NEW.id) INTO user_exists;
  
  -- Only create if user doesn't exist
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
    
    RAISE NOTICE 'Created new user and organization for %', NEW.email;
  ELSE
    RAISE NOTICE 'User % already exists, skipping creation', NEW.email;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
  -- Don't fail the auth.users insert, just log the error
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();





