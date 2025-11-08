-- Add deleted_at column to families table for soft delete functionality
ALTER TABLE families
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for faster queries on deleted families
CREATE INDEX IF NOT EXISTS idx_families_deleted_at
  ON families(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN families.deleted_at IS 'Timestamp when family was soft-deleted. NULL means active.';
