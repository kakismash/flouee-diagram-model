-- Migration: Disable obsolete signup triggers
-- These triggers are replaced by the complete-signup Edge Function
-- The triggers use the old schema (plan instead of subscription_tier, users table)
-- and conflict with the new architecture

-- Disable the email confirmation trigger (replaced by Edge Function)
DROP TRIGGER IF EXISTS on_user_email_confirmed ON auth.users;

-- Disable the no-confirmation trigger (replaced by Edge Function)
DROP TRIGGER IF EXISTS on_auth_user_created_no_confirmation ON auth.users;

-- Note: We keep the functions in case they're referenced elsewhere,
-- but they won't run automatically anymore since the triggers are disabled

-- If you need to re-enable these triggers for any reason, you can:
-- 1. Update them to use the new schema (subscription_tier, user_organizations)
-- 2. Re-create the triggers with: CREATE TRIGGER ...

COMMENT ON FUNCTION public.handle_email_confirmed IS 
'Obsolete: Replaced by complete-signup Edge Function. Trigger disabled.';

COMMENT ON FUNCTION public.handle_new_user_no_confirmation IS 
'Obsolete: Replaced by complete-signup Edge Function. Trigger disabled.';

