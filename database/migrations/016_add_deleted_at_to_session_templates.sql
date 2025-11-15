-- Add deleted_at column to session_templates table for soft delete functionality
ALTER TABLE session_templates
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for faster queries on deleted templates
CREATE INDEX IF NOT EXISTS idx_session_templates_deleted_at
  ON session_templates(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN session_templates.deleted_at IS 'Timestamp when template was soft-deleted. NULL means active.';
