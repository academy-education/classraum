/** @jest-environment node */
/**
 * resolveIdentities feeds the league leaderboard, the friends list and
 * the friend search. It reads `avatar_id` (migration 071) and
 * `avatar_config` (migration 072). NEITHER MIGRATION IS APPLIED.
 *
 * The failure mode this file exists for: PostgREST rejects a select that
 * names an unknown column (42703) and returns `data: null` for the WHOLE
 * query — not just that field. Without the fallback, every display name
 * on the leaderboard silently becomes "Student" the moment this code
 * ships ahead of the migration, and nothing throws.
 *
 * 072 made this a LADDER rather than one fallback, and that is what the
 * middle tests below pin. The obvious way to add avatar_config — put it
 * in the existing wide select — re-arms the trap one rung up: against a
 * post-071/pre-072 database the wide select fails, the single fallback
 * drops all the way to nickname-only, and the avatars that DID work
 * disappear. Each rung has to drop exactly one migration's columns.
 */
import { resolveIdentities, resolveDisplayNames, maskName } from '@/lib/study/identity'
import { dbAdmin } from '@/lib/supabase-admin'
import { tableRouter } from '@/tests/study-route-helpers'
import { DEFAULT_AVATAR_CONFIG } from '@/lib/study/avatarConfig'

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
    enqueue('study_user_prefs', { data: [{ student_id: 'u1', nickname: 'andy', avatar_id: 'person-aster' }] })

    const out = await resolveIdentities(['u1'], 'me')
    expect(out.get('u1')).toEqual({ display_name: 'andy', avatar_id: 'person-aster', avatar_config: null })
  })

  it('KEEPS EVERY DISPLAY NAME when avatar_id does not exist yet (migration 071 unapplied)', async () => {
    enqueue('users', { data: [{ id: 'u1', name: 'Andrew Park' }, { id: 'u2', name: '김민수' }] })
    // The wide select fails outright…
    enqueue('study_user_prefs', { error: UNDEFINED_COLUMN })
    // …and the pre-071 select answers.
    enqueue('study_user_prefs', { data: [{ student_id: 'u1', nickname: 'andy' }] })

    const out = await resolveIdentities(['u1', 'u2'], 'u2')
    // The whole point: names survive, only avatars are absent.
    expect(out.get('u1')).toEqual({ display_name: 'andy', avatar_id: null, avatar_config: null })
    expect(out.get('u2')).toEqual({ display_name: '김민수', avatar_id: null, avatar_config: null })
    expect(out.get('u1')!.display_name).not.toBe('Student')
    expect(warn).toHaveBeenCalled()
  })

  it('KEEPS THE PRESET AVATARS when only avatar_config is missing (072 unapplied, 071 applied)', async () => {
    // The rung the naive fix skips. Everything that worked before 072
    // has to keep working while 072 is unapplied — which is right now.
    enqueue('users', { data: [{ id: 'u1', name: 'Andrew Park' }] })
    enqueue('study_user_prefs', { error: UNDEFINED_COLUMN })
    enqueue('study_user_prefs', { data: [{ student_id: 'u1', nickname: 'andy', avatar_id: 'person-aster' }] })

    const out = await resolveIdentities(['u1'], 'me')
    expect(out.get('u1')).toEqual({
      display_name: 'andy', avatar_id: 'person-aster', avatar_config: null,
    })
  })

  it('returns a normalised config when 072 IS applied', async () => {
    enqueue('users', { data: [{ id: 'u1', name: 'Andrew Park' }] })
    enqueue('study_user_prefs', {
      data: [{
        student_id: 'u1', nickname: 'andy', avatar_id: 'person-aster',
        avatar_config: { skin: 'tone-6', hair: 'two-block', junk: 'x' },
      }],
    })

    const out = await resolveIdentities(['u1'], 'me')
    // Normalised on the SERVER: the parts this build knows survive, the
    // rest fill in from the defaults, and the junk key never reaches a
    // client.
    expect(out.get('u1')!.avatar_config).toEqual({
      ...DEFAULT_AVATAR_CONFIG, skin: 'tone-6', hair: 'two-block',
    })
    expect(out.get('u1')!.avatar_config).not.toHaveProperty('junk')
  })

  it('leaves avatar_config null when the stored value is not an object', async () => {
    // NULL is the "never opened the builder" signal, and a scalar that
    // somehow got in must reach the initials fallback, not a blank disc.
    enqueue('users', { data: [{ id: 'u1', name: 'Andrew Park' }] })
    enqueue('study_user_prefs', {
      data: [{ student_id: 'u1', nickname: 'andy', avatar_id: null, avatar_config: 'oops' }],
    })

    expect((await resolveIdentities(['u1'], 'me')).get('u1')!.avatar_config).toBeNull()
  })

  it('still returns names when EVERY rung of the ladder fails', async () => {
    enqueue('users', { data: [{ id: 'u1', name: 'Andrew Park' }] })
    enqueue('study_user_prefs', { error: UNDEFINED_COLUMN })
    enqueue('study_user_prefs', { error: UNDEFINED_COLUMN })
    enqueue('study_user_prefs', { error: { code: '42P01', message: 'relation does not exist' } })
    const err = jest.spyOn(console, 'error').mockImplementation(() => {})

    const out = await resolveIdentities(['u1'], 'me')
    // No nicknames are available, so the masked real name is the floor —
    // and it must not be the string "Student".
    expect(out.get('u1')!.display_name).toBe(maskName('Andrew Park', false))
    expect(err).toHaveBeenCalled()
    err.mockRestore()
  })

  it('drops an avatar id this build cannot draw, rather than passing it to the client', async () => {
    enqueue('users', { data: [{ id: 'u1', name: 'Andrew Park' }] })
    enqueue('study_user_prefs', { data: [{ student_id: 'u1', nickname: 'andy', avatar_id: 'person-retired-2024' }] })

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
    enqueue('study_user_prefs', { data: [{ student_id: 'u1', nickname: 'andy', avatar_id: 'person-aster' }] })

    const names = await resolveDisplayNames(['u1'], 'me')
    expect(names.get('u1')).toBe('andy')
  })
})
