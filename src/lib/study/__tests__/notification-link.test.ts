import { safeNotificationPath, studyFallbackRoute } from '@/lib/study/notification-link'

describe('safeNotificationPath', () => {
  it('accepts app-relative paths', () => {
    expect(safeNotificationPath('/mobile/study')).toBe('/mobile/study')
    expect(safeNotificationPath('/mobile/study/league')).toBe('/mobile/study/league')
    expect(safeNotificationPath('/mobile/study/stats?tab=week#top')).toBe(
      '/mobile/study/stats?tab=week#top'
    )
  })

  it('rejects protocol-relative URLs', () => {
    expect(safeNotificationPath('//evil.com')).toBeNull()
    expect(safeNotificationPath('//evil.com/mobile/study')).toBeNull()
    expect(safeNotificationPath('/\\evil.com')).toBeNull()
    expect(safeNotificationPath('\\\\evil.com')).toBeNull()
  })

  it('rejects absolute URLs with a scheme', () => {
    expect(safeNotificationPath('https://evil.com')).toBeNull()
    expect(safeNotificationPath('http://evil.com/mobile/study')).toBeNull()
  })

  it('rejects javascript: and other pseudo-schemes', () => {
    expect(safeNotificationPath('javascript:alert(1)')).toBeNull()
    expect(safeNotificationPath('data:text/html,<script>')).toBeNull()
    expect(safeNotificationPath('  javascript:alert(1)')).toBeNull()
  })

  it('rejects empty, whitespace-only, and non-string values', () => {
    expect(safeNotificationPath('')).toBeNull()
    expect(safeNotificationPath('   ')).toBeNull()
    expect(safeNotificationPath(undefined)).toBeNull()
    expect(safeNotificationPath(null)).toBeNull()
    expect(safeNotificationPath(42)).toBeNull()
    expect(safeNotificationPath({ url: '/mobile/study' })).toBeNull()
  })

  it('rejects paths without a leading slash', () => {
    expect(safeNotificationPath('mobile/study')).toBeNull()
    expect(safeNotificationPath('./mobile/study')).toBeNull()
  })

  it('rejects embedded whitespace and control characters', () => {
    expect(safeNotificationPath('/mobile/study evil')).toBeNull()
    expect(safeNotificationPath('/mobile\nstudy')).toBeNull()
  })

  it('rejects absurdly long values', () => {
    expect(safeNotificationPath('/mobile/study?q=' + 'a'.repeat(4000))).toBeNull()
  })
})

describe('studyFallbackRoute', () => {
  it('routes league notifications to the league page', () => {
    expect(studyFallbackRoute('study_league_promoted')).toBe('/mobile/study/league')
    expect(studyFallbackRoute('study_league_demoted')).toBe('/mobile/study/league')
  })

  it('routes the weekly recap to stats', () => {
    expect(studyFallbackRoute('study_weekly_recap')).toBe('/mobile/study/stats')
  })

  it('routes streak and challenge notifications to study home', () => {
    expect(studyFallbackRoute('study_streak_milestone')).toBe('/mobile/study')
    expect(studyFallbackRoute('study_streak_at_risk')).toBe('/mobile/study')
    expect(studyFallbackRoute('study_streak_saved')).toBe('/mobile/study')
    expect(studyFallbackRoute('study_daily_challenge')).toBe('/mobile/study')
  })

  it('routes duels to friends and graded responses to history', () => {
    expect(studyFallbackRoute('study_duel_won')).toBe('/mobile/study/friends')
    expect(studyFallbackRoute('study_duel_lost')).toBe('/mobile/study/friends')
    expect(studyFallbackRoute('study_response_graded')).toBe('/mobile/study/history')
  })

  it('routes billing notifications to the subscription page', () => {
    expect(studyFallbackRoute('study_payment_failed')).toBe('/mobile/study/subscription')
    expect(studyFallbackRoute('study_subscription_expired')).toBe('/mobile/study/subscription')
  })

  it('sends unknown study kinds to study home and ignores non-study types', () => {
    expect(studyFallbackRoute('study_something_new')).toBe('/mobile/study')
    expect(studyFallbackRoute('assignment')).toBeNull()
    expect(studyFallbackRoute('alert')).toBeNull()
    expect(studyFallbackRoute(undefined)).toBeNull()
  })
})
