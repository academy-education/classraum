/**
 * Translation-key registry for every study-domain notification.
 *
 * WHY THIS EXISTS
 * ---------------
 * `notifications` has had `title_key` / `message_key` / `title_params` /
 * `message_params` columns for a long time, and the mobile inbox
 * (src/app/mobile/notifications/page.tsx) renders through `t(key, params)`
 * when they are present. Every academy-domain trigger uses them.
 *
 * The study domain did not. `notifyStudent` took `title` and `message` as
 * literal strings and every call site passed hand-written copy — mostly
 * Korean ("승급! silver 리그로 이동"), occasionally English ("❄️ Streak
 * protected"). The language was frozen at INSERT time, so the row could
 * never be translated at read time: an English student saw Korean, a
 * Korean student saw English, and switching the app language changed
 * nothing. All 11 study rows in production had `title_key IS NULL`.
 *
 * So: call sites now name a (kind, variant) pair from this registry and
 * pass PARAMS. `notifyStudent` writes the keys, and renders the NOT NULL
 * `title`/`message` columns (and the push payload, which has no read-time
 * render step) in the student's own preferred language.
 *
 * PARAM KEY REFERENCES
 * --------------------
 * A param VALUE beginning with '@' is itself a translation key, resolved
 * at render time — e.g. `{ tier: '@notifications.content.study.tier.silver' }`.
 * That keeps enum-ish values (league tiers, skill names) translatable
 * without exploding the registry into one variant per enum member. See
 * `resolveParamKeyRefs` in src/lib/notification-format.ts for the reader
 * side; `PARAM_KEY_REF_PREFIX` below is the single definition of the sigil.
 */

import { languages, getNestedValue } from '@/locales'
import type { StudyNotificationKind } from '@/lib/study/notify'

export const PARAM_KEY_REF_PREFIX = '@'

export type StudyNotifLang = 'english' | 'korean'
export type StudyNotifParams = Record<string, string | number | undefined>

export interface StudyCopy {
  readonly titleKey: string
  readonly messageKey: string
}

const NS = 'notifications.content.study'

/**
 * kind → variant → { titleKey, messageKey }.
 *
 * Every kind in `StudyNotificationKind` MUST appear here, and every key
 * MUST exist in BOTH en.json and ko.json —
 * `src/lib/study/__tests__/study-notification-i18n.test.ts` enumerates
 * this object and fails otherwise.
 *
 * Two kinds (`study_streak_milestone`, `study_daily_challenge`) have no
 * emit site today — the daily-challenge nudge is push-only and the
 * milestone was never wired up. They are registered anyway so the copy
 * is ready and the enumeration stays complete.
 */
export const STUDY_NOTIFICATION_COPY = {
  study_league_promoted: {
    promoted: { titleKey: `${NS}.leaguePromoted.title`, messageKey: `${NS}.leagueRoll.message` },
    promotedCredits: { titleKey: `${NS}.leaguePromoted.title`, messageKey: `${NS}.leagueRoll.messageCredits` },
    stayed: { titleKey: `${NS}.leagueStayed.title`, messageKey: `${NS}.leagueRoll.message` },
    stayedCredits: { titleKey: `${NS}.leagueStayed.title`, messageKey: `${NS}.leagueRoll.messageCredits` },
  },
  study_league_demoted: {
    demoted: { titleKey: `${NS}.leagueDemoted.title`, messageKey: `${NS}.leagueRoll.message` },
    demotedCredits: { titleKey: `${NS}.leagueDemoted.title`, messageKey: `${NS}.leagueRoll.messageCredits` },
  },
  study_weekly_recap: {
    default: { titleKey: `${NS}.weeklyRecap.title`, messageKey: `${NS}.weeklyRecap.message` },
    withTopic: { titleKey: `${NS}.weeklyRecap.title`, messageKey: `${NS}.weeklyRecap.messageWithTopic` },
  },
  study_streak_milestone: {
    default: { titleKey: `${NS}.streakMilestone.title`, messageKey: `${NS}.streakMilestone.message` },
  },
  study_streak_at_risk: {
    default: { titleKey: `${NS}.streakAtRisk.title`, messageKey: `${NS}.streakAtRisk.message` },
  },
  study_streak_saved: {
    default: { titleKey: `${NS}.streakSaved.title`, messageKey: `${NS}.streakSaved.message` },
  },
  study_daily_challenge: {
    default: { titleKey: `${NS}.dailyChallenge.title`, messageKey: `${NS}.dailyChallenge.message` },
  },
  study_duel_won: {
    won: { titleKey: `${NS}.duelWon.title`, messageKey: `${NS}.duelWon.message` },
    wonCredits: { titleKey: `${NS}.duelWon.title`, messageKey: `${NS}.duelWon.messageCredits` },
  },
  study_duel_lost: {
    lost: { titleKey: `${NS}.duelLost.title`, messageKey: `${NS}.duelLost.message` },
    tie: { titleKey: `${NS}.duelTie.title`, messageKey: `${NS}.duelTie.message` },
  },
  study_response_graded: {
    default: { titleKey: `${NS}.responseGraded.title`, messageKey: `${NS}.responseGraded.message` },
    withSummary: { titleKey: `${NS}.responseGraded.title`, messageKey: `${NS}.responseGraded.messageSummary` },
  },
  study_payment_failed: {
    default: { titleKey: `${NS}.paymentFailed.title`, messageKey: `${NS}.paymentFailed.message` },
  },
  study_subscription_expired: {
    default: { titleKey: `${NS}.subscriptionExpired.title`, messageKey: `${NS}.subscriptionExpired.message` },
  },
} as const satisfies Record<StudyNotificationKind, Record<string, StudyCopy>>

export type StudyCopyRegistry = typeof STUDY_NOTIFICATION_COPY
export type StudyCopyVariant<K extends StudyNotificationKind> = keyof StudyCopyRegistry[K] & string

/**
 * PUSH-ONLY copy — nudges that go to the device but write no inbox row,
 * so they have no `StudyNotificationKind` and never touch the
 * `notifications.type` CHECK constraint.
 *
 * These lived as hardcoded ko/en string pairs inside
 * src/app/api/cron/study-push-reminders/route.ts. They were bilingual,
 * so nothing rendered a raw key — but they sat outside the locale files
 * entirely, which meant no guard could see them. The asymmetry that
 * proves the point: the English SRS title carried the card count
 * ("3 cards ready to review") and the Korean one did not ("복습할 카드가
 * 있어요"). Placeholder parity across locales is checked for every key in
 * the registry; a string literal in a route file is checked by nothing.
 *
 * `dailyChallenge` intentionally points at the same keys as the
 * `study_daily_challenge` kind above — one wording, one place to edit.
 * That kind has no inbox emit site, so these keys had been registered
 * and unused while the push shipped a hand-written copy of them.
 */
export const STUDY_PUSH_COPY = {
  srsDue: { titleKey: `${NS}.srsDue.title`, messageKey: `${NS}.srsDue.message` },
  dailyChallenge: { titleKey: `${NS}.dailyChallenge.title`, messageKey: `${NS}.dailyChallenge.message` },
  idleNudge: { titleKey: `${NS}.idleNudge.title`, messageKey: `${NS}.idleNudge.message` },
} as const satisfies Record<string, StudyCopy>

export type StudyPushVariant = keyof typeof STUDY_PUSH_COPY

/** Render a push-only nudge in the recipient's language. */
export function renderStudyPush(
  lang: StudyNotifLang,
  variant: StudyPushVariant,
  params?: StudyNotifParams,
): { title: string; body: string } {
  const copy = STUDY_PUSH_COPY[variant]
  return {
    title: translateStudyKey(lang, copy.titleKey, params),
    body: translateStudyKey(lang, copy.messageKey, params),
  }
}

/**
 * Translation keys referenced from PARAM VALUES rather than from the
 * registry above (the `@key` form). They are just as required, and just
 * as invisible to a grep of the registry, so they are listed here and
 * checked by the same test.
 */
export const LEAGUE_TIER_KEYS = [
  'bronze', 'silver', 'gold', 'sapphire', 'ruby',
  'emerald', 'amethyst', 'pearl', 'obsidian', 'diamond',
] as const

export const STUDY_PARAM_REF_KEYS: readonly string[] = [
  ...LEAGUE_TIER_KEYS.map(t => `${NS}.tier.${t}`),
  `${NS}.skill.speaking`,
  `${NS}.skill.writing`,
]

/** `@`-prefixed reference to a league tier's localized label. */
export function tierParam(tier: string | null | undefined): string {
  const key = (tier ?? '').toLowerCase()
  const known = (LEAGUE_TIER_KEYS as readonly string[]).includes(key)
  // An unknown tier is data we don't control; pass it through verbatim
  // rather than referencing a key that does not exist.
  return known ? `${PARAM_KEY_REF_PREFIX}${NS}.tier.${key}` : (tier ?? '')
}

/** `@`-prefixed reference to a skill's localized label. */
export function skillParam(skill: 'speaking' | 'writing'): string {
  return `${PARAM_KEY_REF_PREFIX}${NS}.skill.${skill}`
}

/** Every (kind, variant) pair in the registry — used by the guard test. */
export function allStudyCopyEntries(): Array<{
  kind: StudyNotificationKind
  variant: string
  copy: StudyCopy
}> {
  const out: Array<{ kind: StudyNotificationKind; variant: string; copy: StudyCopy }> = []
  for (const [kind, variants] of Object.entries(STUDY_NOTIFICATION_COPY)) {
    for (const [variant, copy] of Object.entries(variants as Record<string, StudyCopy>)) {
      out.push({ kind: kind as StudyNotificationKind, variant, copy })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Server-side rendering (for the NOT NULL title/message columns + push body)
// ---------------------------------------------------------------------------

/** True when `key` is missing from the given locale. `getNestedValue`
 *  returns the path itself on a miss — '' is a legitimate translation. */
export function isMissingKey(lang: StudyNotifLang, key: string): boolean {
  const value = getNestedValue(
    languages[lang] as unknown as Record<string, unknown>,
    key,
  )
  return value === key
}

function interpolate(template: string, params: StudyNotifParams | undefined): string {
  if (!params) return template
  let out = template
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue
    out = out
      .replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
      .replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
  }
  return out
}

/**
 * Resolve a single translation key in `lang`, interpolating params.
 * `@key` param values are resolved recursively (one level — a resolved
 * label is plain text, never another reference).
 */
export function translateStudyKey(
  lang: StudyNotifLang,
  key: string,
  params?: StudyNotifParams,
): string {
  const dict = languages[lang] as unknown as Record<string, unknown>
  const raw = getNestedValue(dict, key)
  const template = Array.isArray(raw) ? raw.join(', ') : raw

  let resolved: StudyNotifParams | undefined = params
  if (params) {
    resolved = {}
    for (const [k, v] of Object.entries(params)) {
      if (typeof v === 'string' && v.startsWith(PARAM_KEY_REF_PREFIX)) {
        const refKey = v.slice(PARAM_KEY_REF_PREFIX.length)
        const refRaw = getNestedValue(dict, refKey)
        resolved[k] = Array.isArray(refRaw) ? refRaw.join(', ') : refRaw
      } else {
        resolved[k] = v
      }
    }
  }
  return interpolate(template, resolved)
}

/**
 * Development guard. A missing key used to degrade to the raw path
 * appearing on screen ("notifications.content.study.duelWon.title"), and
 * nothing anywhere said so. Fail loudly at import time instead — this
 * module is imported by every study notification call site, so a missing
 * key surfaces the first time any of them runs locally.
 *
 * Returns the list so tests can assert on it; the console noise is a
 * side effect for developers.
 */
export function findMissingStudyCopyKeys(): string[] {
  const missing: string[] = []
  for (const { kind, variant, copy } of allStudyCopyEntries()) {
    for (const lang of ['english', 'korean'] as const) {
      for (const key of [copy.titleKey, copy.messageKey]) {
        if (isMissingKey(lang, key)) missing.push(`${lang}: ${key} (${kind}/${variant})`)
      }
    }
  }
  for (const [variant, copy] of Object.entries(STUDY_PUSH_COPY)) {
    for (const lang of ['english', 'korean'] as const) {
      for (const key of [copy.titleKey, copy.messageKey]) {
        if (isMissingKey(lang, key)) missing.push(`${lang}: ${key} (push/${variant})`)
      }
    }
  }
  for (const key of STUDY_PARAM_REF_KEYS) {
    for (const lang of ['english', 'korean'] as const) {
      if (isMissingKey(lang, key)) missing.push(`${lang}: ${key} (param ref)`)
    }
  }
  return missing
}

if (process.env.NODE_ENV === 'development') {
  const missing = findMissingStudyCopyKeys()
  if (missing.length > 0) {
    console.error(
      `[study/notification-copy] ${missing.length} study notification translation key(s) missing — ` +
      'these render as the raw key on /mobile/notifications:\n  ' + missing.join('\n  '),
    )
  }
}
