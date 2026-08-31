/** @jest-environment node */
import { classifyDuplicate } from '../join-duplicate'

/**
 * The bug this replaces: the join route swallowed any error whose message
 * contained 'duplicate' and returned success. For a parent joining a
 * SECOND academy that reported a join which never happened, because
 * parents_pkey is PRIMARY KEY (user_id) — one row per user.
 */
describe('parents are single-academy', () => {
  it('flags a parent already linked elsewhere as a conflict', () => {
    expect(classifyDuplicate('parent', 'academy-B', 'academy-A'))
      .toEqual({ kind: 'conflict', existingAcademyId: 'academy-A' })
  })

  it('treats a re-join of the same academy as benign', () => {
    expect(classifyDuplicate('parent', 'academy-A', 'academy-A'))
      .toEqual({ kind: 'already_joined' })
  })

  // A false 409 would block a legitimate re-join, and returning benign
  // grants no access — the caller is already a parent of something.
  it('fails open when the existing row cannot be read', () => {
    expect(classifyDuplicate('parent', 'academy-B', null))
      .toEqual({ kind: 'already_joined' })
  })
})

describe('students may belong to several academies', () => {
  // students has UNIQUE (user_id, academy_id), so a duplicate can ONLY be
  // the same pair repeated. Reporting a conflict here would break the
  // idempotent re-join the route depends on.
  it('never reports a conflict, even against a different academy', () => {
    expect(classifyDuplicate('student', 'academy-B', 'academy-A'))
      .toEqual({ kind: 'already_joined' })
    expect(classifyDuplicate('student', 'academy-A', 'academy-A'))
      .toEqual({ kind: 'already_joined' })
  })
})
