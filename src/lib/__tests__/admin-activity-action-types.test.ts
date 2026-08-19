import fs from 'fs'
import path from 'path'

/**
 * Every action_type logAdminActivity() can emit must exist in the
 * admin_activity_logs CHECK constraint.
 *
 * This failed silently in production from the table's creation until
 * 2026-08-19: the mapping emits 'academy_modified' for any action
 * mentioning an academy, that value was not in the constraint, and
 * .insert() resolves with { error } rather than throwing — so the row
 * was rejected, the caller logged to console, and the audit trail simply
 * lacked every academy-scoped privileged action. Same shape as the
 * notifications-kind CHECK that dropped study notification kinds.
 *
 * Proven before the fix by probing the constraint inside a rolled-back
 * transaction (check_violation), and after it by the same probe passing.
 */

const repo = path.resolve(__dirname, '../../..')

function emittedActionTypes(): string[] {
  const src = fs.readFileSync(path.join(repo, 'src/lib/admin-auth.ts'), 'utf8')
  const start = src.indexOf('const actionType =')
  expect(start).toBeGreaterThan(-1)
  const block = src.slice(start, src.indexOf(';', start))
  // Strip the .includes('academy') style predicates first — their
  // arguments are match tokens, not action_type values, and counting
  // them made an earlier version of this test fail against a constraint
  // that was actually correct.
  const resultsOnly = block.replace(/\.includes\('[^']*'\)/g, '.includes()')
  return [...resultsOnly.matchAll(/'([a-z_]+)'/g)].map((m) => m[1])
}

function allowedActionTypes(): string[] {
  // The migration is the source of truth for the deployed constraint.
  const sql = fs.readFileSync(
    path.join(repo, 'database/migrations/090_admin_activity_academy_modified.sql'),
    'utf8'
  )
  const addIdx = sql.lastIndexOf('ADD CONSTRAINT')
  return [...sql.slice(addIdx).matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1])
}

describe('admin audit trail cannot silently drop rows', () => {
  it('emits at least the academy + user cases we know about', () => {
    const emitted = emittedActionTypes()
    expect(emitted).toContain('academy_modified')
    expect(emitted).toContain('user_modified')
    expect(emitted.length).toBeGreaterThanOrEqual(6)
  })

  it('every emitted action_type is permitted by the constraint', () => {
    const allowed = new Set(allowedActionTypes())
    const rejected = emittedActionTypes().filter((t) => !allowed.has(t))
    expect(rejected).toEqual([])
  })
})
