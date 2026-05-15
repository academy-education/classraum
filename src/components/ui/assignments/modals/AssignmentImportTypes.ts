/**
 * Public types for the AssignmentImportModal flow.
 *
 * Lives in its own tiny module so callers (notably sessions-page) can
 * import `ConfirmedImportDraft` for handler signatures without statically
 * pulling the 676-line modal — and its parser/select/date-input deps —
 * into their bundles. The modal still re-exports both names for backward
 * compat.
 */

import type { AssignmentType } from '@/lib/assignment-parser'

export interface ConfirmedImportDraft {
  title: string
  description?: string
  assignment_type: AssignmentType
  due_date?: string
  /** UUID of the chosen assignment_category, or empty string for none */
  assignment_categories_id?: string
}

export interface ImportCategoryOption {
  id: string
  name: string
}
