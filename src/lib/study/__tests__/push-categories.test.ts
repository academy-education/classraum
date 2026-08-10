/**
 * The push consent gate.
 *
 * Before this existed, `user_preferences.push_notifications` was written
 * by the profile toggle and read by NOBODY: sendPushToStudent selected
 * device_tokens and sent. A student who switched notifications off kept
 * receiving them. A dead settings toggle is a bug; a dead CONSENT toggle
 * is a broken promise.
 *
 * MOST OF THIS FILE TESTS THE FAIL-OPEN DIRECTION, deliberately. The two
 * failure modes are not symmetric:
 *   · wrongly SENT      → a user complains, you find out
 *   · wrongly SUPPRESSED → silence, and nobody reports the notification
 *                          they never received
 * Only one is self-reporting, so the tests weight the other.
 *
 * BREAK-TEST: change the final `!== false` to `=== true` and every
 * "missing key" case fails — which is what muting 420 live users on
 * deploy would have looked like.
 */
import { pushCategoryAllowed, categoryForKind, KIND_CATEGORY } from '../push-categories'

describe('fail open — absence never means opted out', () => {
  it.each([
    ['no row at all', null],
    ['undefined row', undefined],
    ['row with neither field', {}],
    ['master null (never set)', { push_notifications: null }],
    ['categories absent', { push_notifications: true }],
    ['categories empty', { push_notifications: true, push_categories: {} }],
    ['categories null', { push_notifications: true, push_categories: null }],
    ['categories malformed string', { push_notifications: true, push_categories: 'yes' }],
    ['categories an array', { push_notifications: true, push_categories: ['reminders'] }],
    ['a different category off', { push_categories: { social: false } }],
  ])('sends when %s', (_label, row) => {
    expect(pushCategoryAllowed('reminders', row as never)).toBe(true)
  })

  it('sends when the category is unknown to us', () => {
    // An uncategorised push escapes the switches rather than being eaten.
    expect(pushCategoryAllowed(null, { push_categories: { reminders: false } })).toBe(true)
  })
})

describe('explicit opt-out is honoured', () => {
  it('suppresses the category the user turned off', () => {
    expect(pushCategoryAllowed('social', { push_categories: { social: false } })).toBe(false)
  })

  it('leaves the other categories alone', () => {
    const row = { push_categories: { social: false } }
    expect(pushCategoryAllowed('progress', row)).toBe(true)
    expect(pushCategoryAllowed('reminders', row)).toBe(true)
  })

  it('master off stops everything switchable', () => {
    const row = { push_notifications: false }
    expect(pushCategoryAllowed('reminders', row)).toBe(false)
    expect(pushCategoryAllowed('progress', row)).toBe(false)
    expect(pushCategoryAllowed('social', row)).toBe(false)
  })

  it('master must be exactly false — null is "never set", not "off"', () => {
    expect(pushCategoryAllowed('social', { push_notifications: null })).toBe(true)
    expect(pushCategoryAllowed('social', { push_notifications: undefined })).toBe(true)
  })
})

describe('account is not switchable', () => {
  it('sends even with the master switch off', () => {
    // A lapsed card the student never hears about becomes a billing
    // surprise, discovered when a test will not start.
    expect(pushCategoryAllowed('account', { push_notifications: false })).toBe(true)
  })

  it('sends even if someone writes account:false into the JSON directly', () => {
    expect(pushCategoryAllowed('account', {
      push_notifications: false,
      push_categories: { account: false } as never,
    })).toBe(true)
  })
})

describe('the kind → category map', () => {
  it('classifies every billing kind as account', () => {
    expect(KIND_CATEGORY.study_payment_failed).toBe('account')
    expect(KIND_CATEGORY.study_subscription_expired).toBe('account')
  })

  it('maps a known kind', () => {
    expect(categoryForKind('study_duel_lost')).toBe('social')
    expect(categoryForKind('study_weekly_recap')).toBe('progress')
  })

  it('returns null for an unknown or missing kind rather than guessing', () => {
    // Guessing would drop a new kind into whichever bucket was the
    // default — which is how a nudge ends up classified as "account"
    // and unmutable.
    expect(categoryForKind('srsDue')).toBeNull()
    expect(categoryForKind(null)).toBeNull()
    expect(categoryForKind('')).toBeNull()
  })

  it('never leaves a kind unclassified', () => {
    for (const [kind, cat] of Object.entries(KIND_CATEGORY)) {
      expect(['reminders', 'progress', 'social', 'account']).toContain(cat)
      expect(kind.startsWith('study_')).toBe(true)
    }
  })
})
