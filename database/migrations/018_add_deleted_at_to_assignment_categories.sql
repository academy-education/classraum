-- Soft-delete support for assignment_categories.
-- Rationale: we want "deleted" categories to vanish from the management hub
-- and the per-assignment dropdown, but historical assignments that were tagged
-- with the category should continue to display its name. A soft delete keeps
-- the row intact (so the existing FK join keeps resolving) while letting us
-- filter it out of active lists.
--
-- Ordering convention used by the app:
--   SELECT ... FROM assignment_categories WHERE deleted_at IS NULL
-- Assignment rows still JOIN by id regardless of deleted_at, so names show.

ALTER TABLE assignment_categories
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial index: "active categories" lookup is the hot path; deleted rows
-- are a minority. The index only contains non-deleted rows so it stays tiny.
CREATE INDEX IF NOT EXISTS idx_assignment_categories_active_by_subject
  ON assignment_categories(subject_id, display_order)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN assignment_categories.deleted_at IS
  'Soft-delete timestamp. When set, the category is hidden from the hub and assignment dropdowns but historical assignments continue to display its name via the preserved FK target row.';
