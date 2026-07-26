import fs from 'fs'
import path from 'path'
import { NOTIFICATION_TYPES, isNotificationType } from '@/lib/notification-types'

/**
 * Guard for the bug class that hid four undelivered notification kinds:
 * `notifications.type` is policed by a Postgres CHECK constraint, and
 * supabase-js `.insert()` resolves with `{ error }` rather than throwing,
 * so an illegal value is rejected in total silence.
 *
 * The primary guard is the type system (`NotificationInsert.type` is the
 * `NotificationType` union — an illegal literal is a compile error). These
 * tests cover what types cannot: that the union still matches the SQL
 * constraint, and that string-typed insert paths use legal values.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..')
const MIGRATION = path.join(
  REPO_ROOT,
  'database/migrations/052_notifications_allow_system_and_level_test.sql'
)

describe('notification type registry', () => {
  it('matches the CHECK constraint in migration 052 exactly', () => {
    const sql = fs.readFileSync(MIGRATION, 'utf8')
    const body = sql.slice(sql.indexOf('ADD CONSTRAINT notifications_type_check'))
    const fromSql = [...body.matchAll(/'([a-z_]+)'::text/g)].map(m => m[1])

    expect(fromSql.length).toBeGreaterThan(0)
    // Same values AND same count — a stray duplicate is drift too.
    expect([...fromSql].sort()).toEqual([...NOTIFICATION_TYPES].sort())
  })

  it('has no duplicates', () => {
    expect(new Set(NOTIFICATION_TYPES).size).toBe(NOTIFICATION_TYPES.length)
  })

  it('narrows correctly', () => {
    expect(isNotificationType('level_test')).toBe(true)
    expect(isNotificationType('system')).toBe(true)
    expect(isNotificationType('not_a_real_type')).toBe(false)
  })
})

describe('notification insert sites use legal types', () => {
  // Every file that writes `notifications.type`, including the ones whose
  // value is not (or cannot be) statically typed.
  const FILES = [
    'src/lib/notification-triggers.ts',
    'src/lib/study/notify.ts',
    'src/lib/study/test-generation-status.ts',
    'src/app/api/level-tests/[id]/assign/route.ts',
    'src/app/api/cron/study-reap-stuck-generations/route.ts',
    'src/app/api/study/test/generate/route.ts',
  ]

  it.each(FILES)('%s', file => {
    const src = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8')
    // Notification rows are the object literals carrying `user_id:` — look
    // for the `type:` field inside each one. (A bare `type:` scan would
    // also catch SSE event payloads and question kinds, which have nothing
    // to do with this column.) Plus the StudyNotificationKind union members
    // in notify.ts, which land in this column verbatim.
    const literals = [
      ...[...src.matchAll(/\buser_id:/g)].flatMap(m => {
        const window = src.slice(m.index ?? 0, (m.index ?? 0) + 800)
        const hit = /\btype:\s*'([^']+)'/.exec(window)
        return hit ? [hit[1]] : []
      }),
      ...[...src.matchAll(/^\s*\|\s*'(study_[a-z_]+)'/gm)].map(m => m[1]),
    ]
    const illegal = literals.filter(v => !isNotificationType(v))
    expect(illegal).toEqual([])
  })
})
