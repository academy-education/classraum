/**
 * Shared shape + dedupe for the parent's list of children.
 *
 * `get_users_for_family` joins `users` to `students`, and `students` has one
 * row per (user, academy). A child enrolled in two academies therefore comes
 * back as TWO rows with the same id, name and email — which rendered as two
 * visually identical rows in the student picker (and a React duplicate-key
 * error, because the rows are keyed by student id).
 *
 * The picker answers "whose data am I looking at", and that is a person, not
 * an enrolment. So we collapse to one row per child and carry EVERY academy
 * the child belongs to on that row. Nothing downstream may narrow a child to
 * a single academy: the mobile pages scope by their own explicit academy
 * filter, which defaults to "All".
 */

export interface FamilyStudent {
  id: string
  name: string
  email: string
  /**
   * First academy id (sorted) — retained for backwards compatibility with
   * `selectedStudent` values already persisted in localStorage. Prefer
   * `academy_ids`: a child can belong to more than one academy.
   */
  academy_id: string
  /** Every academy this child is enrolled in, sorted and de-duplicated. */
  academy_ids?: string[]
}

interface FamilyStudentRow {
  id: string
  name: string
  email: string
  academy_id: string | null
}

/**
 * Collapse `get_users_for_family` rows to one entry per child, merging the
 * academy ids. Order of first appearance is preserved so the picker is
 * stable across reloads.
 */
export function dedupeFamilyStudents(rows: FamilyStudentRow[]): FamilyStudent[] {
  const byId = new Map<string, { row: FamilyStudentRow; academyIds: Set<string> }>()

  for (const row of rows) {
    if (!row?.id) continue
    const existing = byId.get(row.id)
    if (existing) {
      if (row.academy_id) existing.academyIds.add(row.academy_id)
    } else {
      byId.set(row.id, {
        row,
        academyIds: new Set(row.academy_id ? [row.academy_id] : []),
      })
    }
  }

  return Array.from(byId.values()).map(({ row, academyIds }) => {
    const academy_ids = Array.from(academyIds).sort()
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      academy_id: academy_ids[0] ?? '',
      academy_ids,
    }
  })
}
