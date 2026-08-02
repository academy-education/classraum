/** @jest-environment node */
/**
 * Guards the "study notifications are not translated" bug.
 *
 * BEFORE: `notifyStudent` took `title` and `message` as literal strings.
 * Every call site passed hand-written copy — mostly Korean ("승급!
 * silver 리그로 이동"), occasionally English ("❄️ Streak protected").
 * The language was frozen at INSERT time, `title_key` / `message_key`
 * were never written (0 of 11 production rows had them), and the mobile
 * inbox's `t(key, params)` path was therefore never reached for a study
 * row. An English student read Korean; a Korean student read English.
 *
 * AFTER: call sites name a (kind, variant) from STUDY_NOTIFICATION_COPY
 * and pass params. This file is the check that the registry is complete
 * and that every key it names — plus every `@key` param reference —
 * actually exists in BOTH locales, because a missing key does not throw:
 * `getNestedValue` returns the path, and the path renders on screen.
 *
 * To prove this test can fail, delete e.g.
 * notifications.content.study.duelWon.title from src/locales/ko.json and
 * re-run: "every registered key exists in korean" reports it by name.
 */
import { languages, getNestedValue } from '@/locales'
import {
  STUDY_NOTIFICATION_COPY,
  STUDY_PUSH_COPY,
  STUDY_PARAM_REF_KEYS,
  LEAGUE_TIER_KEYS,
  allStudyCopyEntries,
  renderStudyPush,
  findMissingStudyCopyKeys,
  translateStudyKey,
  tierParam,
  skillParam,
  PARAM_KEY_REF_PREFIX,
} from '@/lib/study/notification-copy'
import { resolveParamKeyRefs } from '@/lib/notification-format'

/** Mirrors StudyNotificationKind. Written out rather than imported so a
 *  kind silently dropped from the union is caught rather than tracked. */
const EXPECTED_KINDS = [
  'study_league_promoted',
  'study_league_demoted',
  'study_weekly_recap',
  'study_streak_milestone',
  'study_streak_at_risk',
  'study_streak_saved',
  'study_daily_challenge',
  'study_duel_won',
  'study_duel_lost',
  'study_response_graded',
  'study_payment_failed',
  'study_subscription_expired',
] as const

const LANGS = ['english', 'korean'] as const

function lookup(lang: (typeof LANGS)[number], key: string): string | string[] {
  return getNestedValue(languages[lang] as unknown as Record<string, unknown>, key)
}

describe('study notification copy registry', () => {
  it('covers every study notification kind', () => {
    expect(Object.keys(STUDY_NOTIFICATION_COPY).sort()).toEqual([...EXPECTED_KINDS].sort())
  })

  it('matches the notifications.type CHECK-constraint list for study kinds', () => {
    // A kind that is not a legal `type` is rejected by Postgres and the
    // row vanishes — the previous bug of this shape (see
    // src/lib/notification-types.ts). Keep the two lists in lockstep.
    const { NOTIFICATION_TYPES } = jest.requireActual<
      typeof import('@/lib/notification-types')
    >('@/lib/notification-types')
    const studyTypes = NOTIFICATION_TYPES.filter(t => t.startsWith('study_')).sort()
    expect(Object.keys(STUDY_NOTIFICATION_COPY).sort()).toEqual(studyTypes)
  })

  it('gives every kind at least one variant', () => {
    for (const kind of EXPECTED_KINDS) {
      const variants = Object.keys(STUDY_NOTIFICATION_COPY[kind])
      expect(variants.length).toBeGreaterThan(0)
    }
  })
})

describe.each(LANGS)('every registered key exists in %s', lang => {
  const entries = allStudyCopyEntries()

  it.each(entries.map(e => [`${e.kind}/${e.variant}`, e] as const))(
    '%s',
    (_label, entry) => {
      for (const [field, key] of [
        ['titleKey', entry.copy.titleKey],
        ['messageKey', entry.copy.messageKey],
      ] as const) {
        const value = lookup(lang, key)
        // getNestedValue returns the PATH on a miss. That is the exact
        // silent failure this test exists to catch.
        expect({ field, key, value }).toEqual({ field, key, value: expect.any(String) })
        expect(value).not.toBe(key)
        expect(String(value).trim()).not.toBe('')
      }
    },
  )

  it('resolves every @-reference param key', () => {
    for (const key of STUDY_PARAM_REF_KEYS) {
      const value = lookup(lang, key)
      expect(value).not.toBe(key)
      expect(String(value).trim()).not.toBe('')
    }
  })
})

/**
 * PUSH-ONLY nudges. These write no inbox row, so they have no kind and
 * are invisible to every check above. They were three hardcoded ko/en
 * string pairs inside the reminders cron — bilingual, so no raw key ever
 * rendered, but outside the locale files and therefore outside every
 * guard. The asymmetry that proves the cost: the English SRS title
 * carried the card count and the Korean one did not.
 */
describe('push-only study copy', () => {
  const pushEntries = Object.entries(STUDY_PUSH_COPY)

  it('registers the nudges the reminders cron sends', () => {
    expect(Object.keys(STUDY_PUSH_COPY).sort()).toEqual(
      ['dailyChallenge', 'idleNudge', 'srsDue'],
    )
  })

  describe.each(LANGS)('resolves in %s', lang => {
    it.each(pushEntries)('%s', (variant, copy) => {
      for (const key of [copy.titleKey, copy.messageKey]) {
        const value = lookup(lang, key)
        expect({ variant, key, value }).toEqual({ variant, key, value: expect.any(String) })
        expect(value).not.toBe(key)
        expect(String(value).trim()).not.toBe('')
      }
    })
  })

  it.each(pushEntries)('%s uses the same params in en and ko', (_variant, copy) => {
    const placeholders = (s: string) =>
      Array.from(s.matchAll(/\{\{?(\w+)\}?\}/g), m => m[1]).sort()
    for (const key of [copy.titleKey, copy.messageKey]) {
      expect(placeholders(String(lookup('korean', key))))
        .toEqual(placeholders(String(lookup('english', key))))
    }
  })

  it('renders each nudge fully in both languages', () => {
    const params = { due: 4, questions: 3 }
    for (const lang of LANGS) {
      for (const variant of Object.keys(STUDY_PUSH_COPY) as Array<keyof typeof STUDY_PUSH_COPY>) {
        const { title, body } = renderStudyPush(lang, variant, params)
        for (const s of [title, body]) {
          expect(s.trim()).not.toBe('')
          expect(s).not.toMatch(/notifications\.content\.study/)
          expect(s).not.toMatch(/\{\w+\}/)
        }
      }
    }
  })

  it('renders Korean to a Korean student and English to an English one', () => {
    const en = renderStudyPush('english', 'srsDue', { due: 4 })
    const ko = renderStudyPush('korean', 'srsDue', { due: 4 })
    expect(en.title).toBe('4 cards ready to review')
    expect(ko.title).toBe('복습할 카드 4장이 기다려요')
    expect(en.body).not.toBe(ko.body)
    // The count reaches BOTH languages. The old hardcoded Korean title
    // dropped it, so Korean students got a strictly less useful push.
    expect(ko.title).toContain('4')
  })
})

describe('the reminders cron does not hardcode copy', () => {
  const stripComments = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

  const read = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path')
    return fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/cron/study-push-reminders/route.ts'),
      'utf8',
    )
  }

  it('contains no Hangul string literals', () => {
    // A hand-written Korean push body in the route is exactly the shape
    // that escaped every i18n guard. Comments are stripped first so the
    // rationale above a fix does not trip its own check.
    const hangul = stripComments(read()).match(/[가-힣]+/g) ?? []
    expect(hangul).toEqual([])
  })

  it('resolves the language with the shared helper, not a local fallback', () => {
    const src = stripComments(read())
    // Reading the study-pref language column directly here skipped the
    // account-level `user_preferences.language` fallback that
    // studentNotifLang applies, and the result was then FORCED onto
    // notifyStudent via `lang:`, overriding it for the inbox row too.
    expect(src).toMatch(/studentNotifLang\(studentId\)/)
    expect(src).not.toMatch(/default_language/)
  })
})

describe('findMissingStudyCopyKeys', () => {
  it('reports nothing for the current locales', () => {
    expect(findMissingStudyCopyKeys()).toEqual([])
  })

  it('would report a key that is genuinely absent', () => {
    // Proves the detector detects — the same lookup on a key nobody
    // defined must come back as missing.
    const absent = 'notifications.content.study.thisKeyDoesNotExist.title'
    for (const lang of LANGS) {
      expect(lookup(lang, absent)).toBe(absent)
    }
  })
})

describe('placeholders agree across locales', () => {
  const placeholders = (s: string) =>
    Array.from(s.matchAll(/\{\{?(\w+)\}?\}/g), m => m[1]).sort()

  it.each(allStudyCopyEntries().map(e => [`${e.kind}/${e.variant}`, e] as const))(
    '%s uses the same params in en and ko',
    (_label, entry) => {
      for (const key of [entry.copy.titleKey, entry.copy.messageKey]) {
        const en = String(lookup('english', key))
        const ko = String(lookup('korean', key))
        // A param present in one locale and not the other renders as a
        // literal "{credits}" for half the userbase.
        expect(placeholders(ko)).toEqual(placeholders(en))
      }
    },
  )
})

describe('rendering', () => {
  it('renders the same row differently per language', () => {
    const titleParams = { tier: tierParam('silver') }
    const messageParams = { rank: 3, fromTier: tierParam('bronze'), toTier: tierParam('silver') }
    const copy = STUDY_NOTIFICATION_COPY.study_league_promoted.promoted

    const en = translateStudyKey('english', copy.titleKey, titleParams)
    const ko = translateStudyKey('korean', copy.titleKey, titleParams)

    expect(en).toBe('Promoted to Silver League!')
    expect(ko).toBe('승급! 실버 리그로 이동')
    expect(en).not.toBe(ko)

    expect(translateStudyKey('english', copy.messageKey, messageParams))
      .toBe('You finished #3 last week — Bronze → Silver.')
    expect(translateStudyKey('korean', copy.messageKey, messageParams))
      .toBe('지난주 3위 — 브론즈 → 실버')
  })

  it('leaves no unfilled placeholders for any registered key', () => {
    // Every param name any template uses, with a stand-in value.
    const sample: Record<string, string | number> = {
      tier: tierParam('gold'), fromTier: tierParam('silver'), toTier: tierParam('gold'),
      rank: 1, credits: 5, hours: 2, accuracy: 80, total: 40, topic: 'Algebra',
      days: 7, questions: 5, minutes: 5, xp: 50,
      family: 'TOEFL', skill: skillParam('speaking'), score: 24, summary: 'Good work.',
    }
    for (const { kind, variant, copy } of allStudyCopyEntries()) {
      for (const lang of LANGS) {
        for (const key of [copy.titleKey, copy.messageKey]) {
          const out = translateStudyKey(lang, key, sample)
          expect(`${kind}/${variant}/${lang}: ${out}`).not.toMatch(/\{\w+\}/)
        }
      }
    }
  })

  it('resolves @-prefixed param references in the reader language', () => {
    const t = (key: string) => String(lookup('korean', key))
    const resolved = resolveParamKeyRefs({ tier: tierParam('diamond'), rank: 2 }, t)
    expect(resolved).toEqual({ tier: '다이아몬드', rank: 2 })
  })

  it('passes non-reference param values through untouched', () => {
    const t = () => 'SHOULD_NOT_BE_CALLED'
    expect(resolveParamKeyRefs({ topic: 'Algebra', total: 12 }, t))
      .toEqual({ topic: 'Algebra', total: 12 })
  })

  it('does not emit a key reference for an unknown tier', () => {
    // An unrecognised tier must not become "@…tier.platinum" — that
    // would render the raw key. Pass the raw value through instead.
    expect(tierParam('platinum')).toBe('platinum')
    expect(tierParam(null)).toBe('')
    for (const tier of LEAGUE_TIER_KEYS) {
      expect(tierParam(tier)).toBe(`${PARAM_KEY_REF_PREFIX}notifications.content.study.tier.${tier}`)
    }
  })
})

describe('the reader renders a stored row in ITS OWN language', () => {
  /** Same composition src/app/mobile/notifications/page.tsx performs:
   *  resolveParamKeyRefs(params, t) → t(key, params). `t` mirrors
   *  LanguageContext's implementation (getNestedValue + {x}/{{x}}). */
  function renderAs(lang: (typeof LANGS)[number], row: {
    title_key: string
    message_key: string
    title_params: Record<string, string | number>
    message_params: Record<string, string | number>
  }) {
    const t = (key: string, params?: Record<string, string | number>) => {
      const raw = lookup(lang, key)
      let out = Array.isArray(raw) ? raw.join(', ') : raw
      for (const [k, v] of Object.entries(params ?? {})) {
        out = out
          .replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
          .replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
      return out
    }
    return {
      title: t(row.title_key, resolveParamKeyRefs(row.title_params, t)),
      message: t(row.message_key, resolveParamKeyRefs(row.message_params, t)),
    }
  }

  // Exactly what notifyStudent stores for a duel win with credits.
  const duelRow = {
    title_key: STUDY_NOTIFICATION_COPY.study_duel_won.wonCredits.titleKey,
    message_key: STUDY_NOTIFICATION_COPY.study_duel_won.wonCredits.messageKey,
    title_params: {},
    message_params: { xp: 260, credits: 3 },
  }

  it('shows English to an English reader and Korean to a Korean reader', () => {
    expect(renderAs('english', duelRow)).toEqual({
      title: 'Duel won! 🏆',
      message: 'You took it with 260 XP and earned 3 credits.',
    })
    expect(renderAs('korean', duelRow)).toEqual({
      title: '듀얼 승리! 🏆',
      message: '260 XP로 승리하고 크레딧 3개를 받았어요.',
    })
  })

  it('translates @-reference params for the reader, not the writer', () => {
    const leagueRow = {
      title_key: STUDY_NOTIFICATION_COPY.study_league_demoted.demoted.titleKey,
      message_key: STUDY_NOTIFICATION_COPY.study_league_demoted.demoted.messageKey,
      title_params: { tier: tierParam('bronze') },
      message_params: { rank: 29, fromTier: tierParam('silver'), toTier: tierParam('bronze') },
    }
    expect(renderAs('english', leagueRow).title).toBe('Moved down to Bronze League')
    expect(renderAs('korean', leagueRow).title).toBe('브론즈 리그로 강등')
    expect(renderAs('english', leagueRow).message)
      .toBe('You finished #29 last week — Silver → Bronze.')
    expect(renderAs('korean', leagueRow).message)
      .toBe('지난주 29위 — 실버 → 브론즈')
  })

  it('never renders a raw key or an unfilled placeholder', () => {
    for (const lang of LANGS) {
      const out = renderAs(lang, duelRow)
      for (const s of [out.title, out.message]) {
        expect(s).not.toMatch(/notifications\.content\.study/)
        expect(s).not.toMatch(/[@{]/)
      }
    }
  })
})

describe('no study call site bakes literal copy any more', () => {
  it('notifyStudent has no title/message parameters', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/study/notify.ts'),
      'utf8',
    )
    // The signature must not accept literal copy. If someone re-adds
    // `title: string` the whole scheme quietly reverts.
    const signature = src.slice(src.indexOf('export async function notifyStudent'))
    const params = signature.slice(0, signature.indexOf('}): Promise<void>'))
    expect(params).not.toMatch(/^\s*title\??:\s*string/m)
    expect(params).not.toMatch(/^\s*message\??:\s*string/m)
    expect(params).toMatch(/variant:/)
  })

  it('has the mobile inbox actually calling resolveParamKeyRefs', async () => {
    // The reader tests above exercise resolveParamKeyRefs directly. That
    // is only evidence if the page calls it — otherwise `@…tier.silver`
    // reaches the screen verbatim and every test still passes.
    const fs = await import('fs')
    const path = await import('path')
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/mobile/notifications/page.tsx'),
      'utf8',
    )
    expect(src).toMatch(/resolveParamKeyRefs\(\s*toParams\(notif\.title_params\)/)
    expect(src).toMatch(/resolveParamKeyRefs\(\s*\n?\s*augmentLocalizedTimeParams\(/)
  })

  it('writes title_key and message_key on every insert', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/study/notify.ts'),
      'utf8',
    )
    expect(src).toMatch(/title_key:\s*copy\.titleKey/)
    expect(src).toMatch(/message_key:\s*copy\.messageKey/)
  })
})
