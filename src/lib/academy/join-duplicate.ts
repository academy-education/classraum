/**
 * What a duplicate-key error means when someone joins an academy.
 *
 * It means DIFFERENT things per table, and the join route originally
 * treated them alike — swallowing anything whose message contained
 * 'duplicate' and returning success:
 *
 *   students  UNIQUE (user_id, academy_id). A duplicate is a re-join of
 *             the SAME academy, so it is genuinely idempotent.
 *   parents   PRIMARY KEY (user_id). One row per user, full stop. A
 *             parent already linked to academy A who joins academy B
 *             collides on the PK — and was told they had joined B while
 *             remaining only in A.
 *
 * Both constraints verified against the live schema on 2026-08-29.
 */

export type JoinRole = 'student' | 'parent'

export type DuplicateVerdict =
  /** Benign: the row already says what the caller asked for. */
  | { kind: 'already_joined' }
  /** The user is a parent somewhere else; parents are single-academy. */
  | { kind: 'conflict'; existingAcademyId: string }

/**
 * @param existingAcademyId the academy on the row that already exists,
 *        or null when we could not read one back.
 */
export function classifyDuplicate(
  role: JoinRole,
  requestedAcademyId: string,
  existingAcademyId: string | null,
): DuplicateVerdict {
  // A student duplicate can only be (user, academy) repeated, because the
  // unique key contains both columns. Nothing to check.
  if (role === 'student') return { kind: 'already_joined' }

  // A parent duplicate is ambiguous until the existing row is read. When
  // it cannot be read, treat it as benign rather than inventing a
  // conflict: a false 409 blocks a legitimate re-join, and the caller is
  // already a parent of SOMETHING, so no access is being granted here.
  if (!existingAcademyId) return { kind: 'already_joined' }

  return existingAcademyId === requestedAcademyId
    ? { kind: 'already_joined' }
    : { kind: 'conflict', existingAcademyId }
}
