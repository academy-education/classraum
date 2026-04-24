-- Add display_order column to assignment_categories so users can manually
-- reorder categories within a subject. NULL-safe default so existing rows
-- fall back to created_at ordering until they're explicitly repositioned.
--
-- Ordering convention used by the app:
--   ORDER BY display_order NULLS LAST, created_at ASC
-- This means reordered categories appear first in their explicit order, and
-- everything else trails them in creation order — a safe fallback before the
-- migration has been run, or for categories created outside the UI.

ALTER TABLE assignment_categories
ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Partial index: only index rows that actually have an order set. Keeps the
-- index small since the common case will be "has been reordered at least once."
CREATE INDEX IF NOT EXISTS idx_assignment_categories_display_order
  ON assignment_categories(subject_id, display_order)
  WHERE display_order IS NOT NULL;

COMMENT ON COLUMN assignment_categories.display_order IS
  'User-controlled sort order within a subject. NULL means fall back to created_at.';
