-- Add theme support to users table
-- This migration adds theme_id field to store user's preferred theme

-- Add theme_id column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_id TEXT;

-- Add comment to document the field
COMMENT ON COLUMN users.theme_id IS 'User preferred theme ID for UI customization';

-- Create index for better performance when querying by theme
CREATE INDEX IF NOT EXISTS idx_users_theme_id ON users(theme_id);

-- Update the updated_at trigger to include theme_id changes
-- (The existing trigger already handles this since it updates on any column change)
