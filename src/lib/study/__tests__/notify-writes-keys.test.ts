/** @jest-environment node */
/**
 * Behavioural half of the study-notification i18n guard.
 *
 * The registry test (study-notification-i18n.test.ts) proves the KEYS
 * exist. This one proves `notifyStudent` actually WRITES them — the
 * original bug was not a missing key, it was a writer that never stored
 * one and baked a language into `title`/`message` instead.
 *
 * Deleting `title_key: copy.titleKey` from the insert in
 * src/lib/study/notify.ts makes "stores the translation keys" fail.
 * Rendering the plaintext in a fixed language instead of the student's
 * makes "renders the NOT NULL plaintext in the student's language" fail.
 */

type Row = Record<string, unknown>

const insert = jest.fn(async (_row: Row) => ({ error: null }))
const maybeSingle = jest.fn()
const sendPushToStudent = jest.fn(
  async (_studentId: string, _payload: { title: string; body: string; url?: string }) =>
    ({ sent: 1, failed: 0, skipped: false }),
)

jest.mock('@/lib/supabase-admin', () => ({
  dbAdmin: {
    from: (table: string) => {
      if (table === 'notifications') return { insert }
      return {
        select: () => ({ eq: () => ({ maybeSingle }) }),
      }
    },
  },
}))
jest.mock('@/lib/study/push', () => ({
  sendPushToStudent: (
    studentId: string,
    payload: { title: string; body: string; url?: string },
  ) => sendPushToStudent(studentId, payload),
}))

/** The single row `notifyStudent` inserted during the current test. */
function insertedRow(index = 0): Row {
  expect(insert.mock.calls.length).toBeGreaterThan(index)
  return insert.mock.calls[index][0]
}

import { notifyStudent } from '@/lib/study/notify'
import { STUDY_NOTIFICATION_COPY, tierParam } from '@/lib/study/notification-copy'

/** Make the student's language lookup resolve to `lang`. The helper
 *  reads study_user_prefs first, then user_preferences. */
function withLanguage(lang: 'ko' | 'en') {
  maybeSingle.mockReset()
  maybeSingle.mockResolvedValue({ data: { default_language: lang }, error: null })
}

beforeEach(() => {
  insert.mockClear()
  sendPushToStudent.mockClear()
  withLanguage('en')
})

describe('notifyStudent', () => {
  it('stores the translation keys and params, not baked copy', async () => {
    await notifyStudent({
      studentId: 'student-1',
      kind: 'study_league_promoted',
      variant: 'promotedCredits',
      titleParams: { tier: tierParam('silver') },
      messageParams: { rank: 3, fromTier: tierParam('bronze'), toTier: tierParam('silver'), credits: 8 },
      link: '/mobile/study/league',
    })

    expect(insert).toHaveBeenCalledTimes(1)
    const row = insertedRow()
    const copy = STUDY_NOTIFICATION_COPY.study_league_promoted.promotedCredits

    expect(row.type).toBe('study_league_promoted')
    expect(row.title_key).toBe(copy.titleKey)
    expect(row.message_key).toBe(copy.messageKey)
    expect(row.title_params).toEqual({ tier: '@notifications.content.study.tier.silver' })
    expect(row.message_params).toEqual({
      rank: 3,
      fromTier: '@notifications.content.study.tier.bronze',
      toTier: '@notifications.content.study.tier.silver',
      credits: 8,
    })
    expect(row.navigation_data).toEqual({ url: '/mobile/study/league' })
  })

  it('renders the NOT NULL plaintext in the student\'s own language', async () => {
    withLanguage('ko')
    await notifyStudent({
      studentId: 'student-ko',
      kind: 'study_league_promoted',
      variant: 'promoted',
      titleParams: { tier: tierParam('silver') },
      messageParams: { rank: 3, fromTier: tierParam('bronze'), toTier: tierParam('silver') },
    })
    const ko = insertedRow()
    expect(ko.title).toBe('승급! 실버 리그로 이동')
    expect(ko.message).toBe('지난주 3위 — 브론즈 → 실버')

    insert.mockClear()
    withLanguage('en')
    await notifyStudent({
      studentId: 'student-en',
      kind: 'study_league_promoted',
      variant: 'promoted',
      titleParams: { tier: tierParam('silver') },
      messageParams: { rank: 3, fromTier: tierParam('bronze'), toTier: tierParam('silver') },
    })
    const en = insertedRow()
    expect(en.title).toBe('Promoted to Silver League!')
    expect(en.message).toBe('You finished #3 last week — Bronze → Silver.')

    // The whole point: the same event produces different plaintext for
    // two students, and neither is hard-coded at the call site.
    expect(en.title).not.toBe(ko.title)
  })

  it('never leaves an unresolved @key or {placeholder} in the stored text', async () => {
    withLanguage('ko')
    await notifyStudent({
      studentId: 's',
      kind: 'study_response_graded',
      variant: 'withSummary',
      titleParams: { family: 'TOEFL', skill: '@notifications.content.study.skill.speaking', score: 24 },
      messageParams: { summary: 'Clear delivery.' },
    })
    const row = insertedRow()
    expect(row.title).toBe('TOEFL 말하기 평가 완료 — 24점')
    expect(String(row.title)).not.toMatch(/[@{]/)
    expect(String(row.message)).not.toMatch(/[@{]/)
  })

  it('pushes the same localized text it stored', async () => {
    withLanguage('ko')
    await notifyStudent({
      studentId: 's',
      kind: 'study_payment_failed',
      variant: 'default',
      link: '/mobile/study/subscription',
      push: true,
    })
    const row = insertedRow()
    expect(sendPushToStudent).toHaveBeenCalledWith('s', {
      title: row.title,
      body: row.message,
      url: '/mobile/study/subscription',
    })
    expect(row.title).toBe('결제에 실패했어요')
  })

  it('honours an explicit lang override without querying preferences', async () => {
    maybeSingle.mockReset()
    maybeSingle.mockRejectedValue(new Error('should not be called'))
    await notifyStudent({
      studentId: 's',
      kind: 'study_streak_saved',
      variant: 'default',
      messageParams: { days: 12 },
      lang: 'korean',
    })
    const row = insertedRow()
    expect(row.title).toBe('❄️ 연속 기록을 지켰어요')
    expect(row.message).toContain('12일')
  })

  it('drops an unsafe link rather than storing it', async () => {
    await notifyStudent({
      studentId: 's',
      kind: 'study_streak_saved',
      variant: 'default',
      messageParams: { days: 3 },
      link: 'https://evil.example.com',
    })
    const row = insertedRow()
    expect(row.navigation_data).toBeNull()
  })
})
