-- Add fields to store user info before they sign up
-- This allows creating family structures before users exist in the system
ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Make user_id nullable since we may not have the user yet
ALTER TABLE family_members
  ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint: either user_id OR user_name must exist
-- This ensures we always have some way to identify the family member
ALTER TABLE family_members
  DROP CONSTRAINT IF EXISTS user_id_or_name_required;

ALTER TABLE family_members
  ADD CONSTRAINT user_id_or_name_required
  CHECK (user_id IS NOT NULL OR user_name IS NOT NULL);

-- Add index for faster lookups when users sign up and we need to match by email
CREATE INDEX IF NOT EXISTS idx_family_members_email
  ON family_members(email)
  WHERE email IS NOT NULL;

-- Add index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_family_members_phone
  ON family_members(phone)
  WHERE phone IS NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN family_members.user_name IS 'Name of family member before they sign up. Used for CSV imports.';
COMMENT ON COLUMN family_members.email IS 'Email for matching when user signs up';
COMMENT ON COLUMN family_members.phone IS 'Phone number for contact and matching';
