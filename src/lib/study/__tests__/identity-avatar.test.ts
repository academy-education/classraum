/** @jest-environment node */
/**
 * resolveIdentities feeds the league leaderboard, the friends list and
 * the friend search. It reads `avatar_id`, a column migration 071 adds
 * and which IS NOT APPLIED YET.
 *
 * The failure mode this file exists for: PostgREST rejects a select that
 * names an unknown column (42703) and returns `data: null` for the WHOLE
 * query — not just that field. Without the fallback, every display name
 * on the leaderboard silently becomes "Student" the moment this code
 * ships ahead of the migration, and nothing throws.
 */
import { resolveIdentities, resolveDisplayNames, maskName } from '@/lib/study/identity'
import { dbAdmin } from '@/lib/supabase-admin'
import { tableRouter } from '@/tests/study-route-helpers'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: { from: jest.fn() } }))

const fromMock = dbAdmin.from as unknown as jest.Mock

/** PostgREST's "column does not exist". */
const UNDEFINED_COLUMN = {
  code: '42703',
  message: 'column study_user_prefs.avatar_id does not exist',
}

describe('resolveIdentities', () => {
  let enqueue: ReturnType<typeof tableRouter>
  let warn: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    enqueue = tableRouter(fromMock)
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => warn.mockRestore())

  it('returns nickname + avatar when the column exists', async () => {
    enqueue('users', { data: [{ id: 'u1', name: 'Andrew Park' }] })
    enqueue('study_user_prefs', { data: [{ student_id: 'u1', nickname: 'andy', avatar_id: 'raumi-mint' }] })

    const out = await resolveIdentities(['u1'], 'me')
    expect(out.get('u1')).toEqual({ display_name: 'andy', avatar_id: 'raumi-mint' })
  })

  it('KEEPS EVERY DISPLAY NAME when avatar_id does not exist yet (migration 071 unapplied)', async () => {
    enqueue('users', { data: [{ id: 'u1', name: 'Andrew Park' }, { id: 'u2', name: '김민수' }] })
    // The wide select fails outright…
    enqueue('study_user_prefs', { error: UNDEFINED_COLUMN })
    // …and the pre-071 select answers.
    enqueue('study_user_prefs', { data: [{ student_id: 'u1', nickname: 'andy' }] })

    const out = await resolveIdentities(['u1', 'u2'], 'u2')
    // The whole point: names survive, only avatars are absent.
    expect(out.get('u1')).toEqual({ display_name: 'andy', avatar_id: null })
    expect(out.get('u2')).toEqual({ display_name: '김민수', avatar_id: null })
    expect(out.get('u1')!.display_name).not.toBe('Student')
    expect(warn).toHaveBeenCalled()
  })

  it('drops an avatar id this build cannot draw, rather than passing it to the client', async () => {
    enqueue('users', { data: [{ id: 'u1', name: 'Andrew Park' }] })
    enqueue('study_user_prefs', { data: [{ student_id: 'u1', nickname: 'andy', avatar_id: 'raumi-retired-2024' }] })

    // null is the initials fallback; the unknown id would have been a
    // blank disc on every surface that renders this student.
    expect((await resolveIdentities(['u1'], 'me')).get('u1')!.avatar_id).toBeNull()
  })

  it('masks a real name for others and not for the caller, with or without avatars', async () => {
    enqueue('users', { data: [{ id: 'u1', name: 'Andrew Park' }, { id: 'me', name: 'Andrew Park' }] })
    enqueue('study_user_prefs', { data: [] })

    const out = await resolveIdentities(['u1', 'me'], 'me')
    expect(out.get('u1')!.display_name).toBe(maskName('Andrew Park', false))
    expect(out.get('u1')!.display_name).not.toBe('Andrew Park')
    expect(out.get('me')!.display_name).toBe('Andrew Park')
  })

  it('makes no query for an empty id list', async () => {
    expect((await resolveIdentities([], 'me')).size).toBe(0)
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('resolveDisplayNames still returns just the names', async () => {
    enqueue('users', { data: [{ id: 'u1', name: 'Andrew Park' }] })
    enqueue('study_user_prefs', { data: [{ student_id: 'u1', nickname: 'andy', avatar_id: 'raumi-mint' }] })

    const names = await resolveDisplayNames(['u1'], 'me')
    expect(names.get('u1')).toBe('andy')
  })
})
