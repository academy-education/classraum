import { GRACE_DAYS, isDeletableUnconfirmed } from '../unconfirmed-cleanup'

const now = new Date('2026-10-01T00:00:00Z')
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString()
const base = { id: 'u', email: 'a@b.com', app_metadata: { provider: 'email', providers: ['email'] } }

describe('isDeletableUnconfirmed', () => {
  it('deletes an email account that never confirmed, never signed in, older than the grace period', () => {
    expect(isDeletableUnconfirmed({ ...base, created_at: daysAgo(GRACE_DAYS + 1), email_confirmed_at: null, last_sign_in_at: null }, now)).toBe(true)
  })
  it('keeps confirmed accounts, signed-in accounts, young accounts, and social accounts', () => {
    expect(isDeletableUnconfirmed({ ...base, created_at: daysAgo(30), email_confirmed_at: daysAgo(29) }, now)).toBe(false)
    expect(isDeletableUnconfirmed({ ...base, created_at: daysAgo(30), email_confirmed_at: null, last_sign_in_at: daysAgo(1) }, now)).toBe(false)
    expect(isDeletableUnconfirmed({ ...base, created_at: daysAgo(GRACE_DAYS - 1), email_confirmed_at: null }, now)).toBe(false)
    expect(isDeletableUnconfirmed({ ...base, created_at: daysAgo(30), email_confirmed_at: null, app_metadata: { provider: 'apple', providers: ['apple'] } }, now)).toBe(false)
    expect(isDeletableUnconfirmed({ ...base, created_at: daysAgo(30), email_confirmed_at: null, app_metadata: { providers: ['email', 'google'] } }, now)).toBe(false)
  })
})
