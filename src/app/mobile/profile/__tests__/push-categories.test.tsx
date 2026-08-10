/**
 * @jest-environment jsdom
 *
 * The per-category push switches on the mobile profile page.
 *
 * The load-bearing assertion is (a): `user_preferences.push_categories`
 * is `{}` for every one of the ~420 existing rows, and it MUST render as
 * all three categories ON. The hook reads `!== false` for exactly that
 * reason. Reading absent as "opted out" — the `=== true` spelling — is a
 * one-character change that mutes the entire user base on deploy, and
 * nobody files a bug about a notification they did not receive.
 *
 * BREAK-TEST (2026-08-11): changing the three reads in
 * useMobileProfile.ts from `!== false` to `=== true` turns test (a) red
 * (3 of the 4 assertions in it fail) and leaves the rest green — which
 * is why (a) is written against the DEFAULT row rather than a stored
 * `{"reminders":true,...}`, the shape no real row has.
 *
 * (c) is the other bug this feature exists to prevent: a switch that
 * renders and flips optimistically but never reaches the upsert. So the
 * assertion is on the payload handed to supabase, not on the rendered
 * state — the state would be right either way.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

// --- Fixtures -------------------------------------------------------
const USER = { id: 'u1', name: 'Andrew', email: 'a@b.c', role: 'student', phone: null }

/** The user_preferences row under test. `null` = no row at all. */
let PREFS_ROW: Record<string, unknown> | null
/** Every payload handed to .upsert(), in order. */
let upserts: Record<string, unknown>[]

function table(name: string) {
  const rowsFor = () => {
    if (name === 'users') return [USER]
    if (name === 'user_preferences') return PREFS_ROW ? [PREFS_ROW] : []
    return []
  }
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'limit', 'in', 'is']) chain[m] = () => chain
  chain.single = () => {
    const rows = rowsFor()
    return rows.length === 1
      ? Promise.resolve({ data: rows[0], error: null })
      : Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
  }
  chain.maybeSingle = () => {
    const rows = rowsFor()
    return Promise.resolve({ data: rows.length === 1 ? rows[0] : null, error: null })
  }
  chain.upsert = (payload: Record<string, unknown>) => {
    upserts.push(payload)
    return Promise.resolve({ data: null, error: null })
  }
  chain.update = () => chain
  chain.then = (r: (v: unknown) => unknown) => Promise.resolve({ data: rowsFor(), error: null }).then(r)
  return chain
}

jest.mock('@/lib/supabase', () => ({
  db: { from: (t: string) => table(t) },
  supabase: { auth: { signOut: jest.fn() } },
}))

// Push settings are native-only on this page, so the card does not exist
// on the web at all — the test has to be a native one to see it.
jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
}))
jest.mock('@/lib/nativeHaptics', () => ({ hapticTap: jest.fn(), hapticSelect: jest.fn() }))
jest.mock('@/lib/logout', () => ({ performLogout: jest.fn() }))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))

// t() returns the key, so every switch's accessible name IS its key —
// which keeps these assertions independent of the English copy.
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, tList: () => [], language: 'english', setLanguage: () => {} }),
}))
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, tList: () => [], language: 'english', setLanguage: () => {} }),
}))
jest.mock('@/contexts/PersistentMobileAuth', () => ({
  usePersistentMobileAuth: () => ({ user: { userId: 'u1', userName: 'Andrew', role: 'student' } }),
}))
jest.mock('@/hooks/useEffectiveUserId', () => ({
  useEffectiveUserId: () => ({ effectiveUserId: 'u1', isReady: true, isLoading: false, academyIds: [] }),
}))
jest.mock('@/stores/selectedStudentStore', () => ({
  useSelectedStudentStore: () => ({ selectedStudent: null, availableStudents: [], setSelectedStudent: jest.fn() }),
  useSelectedStudentHydrated: () => true,
}))
jest.mock('@/lib/study/currentMode', () => ({ readStoredMode: () => 'study' }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))
// Study cards fetch their own data and are irrelevant here.
jest.mock('../StudyNicknameCard', () => ({ StudyNicknameCard: () => null }))
jest.mock('../StudyAvatarCard', () => ({ StudyAvatarCard: () => null }))
jest.mock('@/app/mobile/study/_shared/usePullToRefresh', () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProfilePage = require('../page').default

const KEY = {
  master: 'mobile.profile.pushNotifications',
  reminders: 'mobile.profile.pushCategory.reminders',
  progress: 'mobile.profile.pushCategory.progress',
  social: 'mobile.profile.pushCategory.social',
}

const sw = (name: string) => screen.getByRole('switch', { name })

async function renderProfile() {
  render(<ProfilePage />)
  await waitFor(() => expect(screen.getByRole('switch', { name: KEY.master })).toBeInTheDocument())
}

beforeEach(() => {
  sessionStorage.clear()
  upserts = []
  // Master ON so the categories are live; each test that needs it off
  // overrides PREFS_ROW before rendering.
  PREFS_ROW = { user_id: 'u1', push_notifications: true, email_notifications: {}, language: 'english' }
})

describe('push category switches', () => {
  it('(a) renders every category ON when push_categories is absent', async () => {
    // Exactly the shape of a pre-migration-080 row: the key is not there
    // at all. This is the fail-open case and the one that matters.
    await renderProfile()

    expect(sw(KEY.master)).toHaveAttribute('aria-checked', 'true')
    expect(sw(KEY.reminders)).toHaveAttribute('aria-checked', 'true')
    expect(sw(KEY.progress)).toHaveAttribute('aria-checked', 'true')
    expect(sw(KEY.social)).toHaveAttribute('aria-checked', 'true')
  })

  it('(a2) renders every category ON when the column is an empty object', async () => {
    // What the migration actually writes as the DEFAULT.
    PREFS_ROW = { ...PREFS_ROW!, push_categories: {} }
    await renderProfile()

    expect(sw(KEY.reminders)).toHaveAttribute('aria-checked', 'true')
    expect(sw(KEY.progress)).toHaveAttribute('aria-checked', 'true')
    expect(sw(KEY.social)).toHaveAttribute('aria-checked', 'true')
  })

  it('(b) {"social":false} turns social OFF and leaves the others ON', async () => {
    PREFS_ROW = { ...PREFS_ROW!, push_categories: { social: false } }
    await renderProfile()

    expect(sw(KEY.social)).toHaveAttribute('aria-checked', 'false')
    expect(sw(KEY.reminders)).toHaveAttribute('aria-checked', 'true')
    expect(sw(KEY.progress)).toHaveAttribute('aria-checked', 'true')
  })

  it('(c) toggling a category upserts push_categories with that key false', async () => {
    PREFS_ROW = { ...PREFS_ROW!, push_categories: {} }
    await renderProfile()

    fireEvent.click(sw(KEY.progress))
    await waitFor(() => expect(upserts.length).toBe(1))

    // The whole point: the key reaches the DATABASE call, not just state.
    expect(upserts[0].push_categories).toEqual({ reminders: true, progress: false, social: true })
    // And the master boolean is still carried, so flipping a category
    // cannot blank it.
    expect(upserts[0].push_notifications).toBe(true)
  })

  it('(c2) toggling a category back ON writes true, not a removed key', async () => {
    PREFS_ROW = { ...PREFS_ROW!, push_categories: { social: false } }
    await renderProfile()

    fireEvent.click(sw(KEY.social))
    await waitFor(() => expect(upserts.length).toBe(1))
    expect(upserts[0].push_categories).toEqual({ reminders: true, progress: true, social: true })
  })

  it('(d) master OFF disables the category switches but keeps them visible', async () => {
    PREFS_ROW = { ...PREFS_ROW!, push_notifications: false }
    await renderProfile()

    // Visible — a control that vanishes reads as a bug.
    expect(sw(KEY.reminders)).toBeInTheDocument()
    expect(sw(KEY.progress)).toBeInTheDocument()
    expect(sw(KEY.social)).toBeInTheDocument()

    for (const k of [KEY.reminders, KEY.progress, KEY.social]) {
      expect(sw(k)).toBeDisabled()
    }
    // The master itself stays operable, or there would be no way back.
    expect(sw(KEY.master)).not.toBeDisabled()

    // Disabled means disabled: a click writes nothing.
    fireEvent.click(sw(KEY.social))
    expect(upserts.length).toBe(0)
  })

  it('account & billing is shown but has no switch', async () => {
    await renderProfile()

    expect(screen.getByText('mobile.profile.pushCategory.account')).toBeInTheDocument()
    expect(screen.getByText('mobile.profile.pushAlwaysOn')).toBeInTheDocument()
    // Four switchable controls on this card at most: master + 3. An
    // `account` toggle must never appear — the column's CHECK rejects
    // the key, so a switch for it could only ever fail to save.
    expect(
      screen.queryByRole('switch', { name: 'mobile.profile.pushCategory.account' }),
    ).toBeNull()
  })
})
