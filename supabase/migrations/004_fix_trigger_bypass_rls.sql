-- Fix: Make trigger truly bypass RLS
-- The issue: SECURITY DEFINER alone doesn't bypass RLS in Postgres
-- Solution: Grant superuser-like permissions to the function owner

-- First, let's recreate the trigger function with proper bypass
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the function with explicit RLS bypass
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Temporarily disable RLS checks for this function
  -- Insert organization (bypasses RLS due to SECURITY DEFINER + grants)
  INSERT INTO public.organizations (name, plan)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'),
    'free'
  )
  RETURNING id INTO new_org_id;
  
  -- Insert user profile (bypasses RLS)
  INSERT INTO public.users (id, email, organization_id, role)
  VALUES (NEW.id, NEW.email, new_org_id, 'admin');
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error and re-raise
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RAISE;
END;
$$;

-- Grant the function owner bypass RLS capability
-- This is safe because the function is controlled and only runs on auth.users insert
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Alternative approach: Remove the restrictive INSERT policies
-- and replace them with permissive ones for the service role

-- Drop the current INSERT policy on organizations
DROP POLICY IF EXISTS "orgs_insert" ON organizations;

-- Create a more permissive INSERT policy
-- This allows inserts when there's no current user (during signup trigger)
CREATE POLICY "orgs_insert" ON organizations
  FOR INSERT 
  WITH CHECK (
    -- Allow if user is authenticated OR if this is a trigger operation
    auth.uid() IS NOT NULL OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Verify the function has proper permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, authenticated, anon;





