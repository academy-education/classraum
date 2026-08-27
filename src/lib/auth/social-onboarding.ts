/**
 * Who gets the blocking "finish your profile" step after a social signup.
 *
 * WHY IT EXISTS
 *
 * A password signup collects a name and — at the study door — a phone
 * number. A social signup collects neither: the provider hands over an
 * email and, at best, a display name. `users.phone` therefore stays NULL
 * for every Google/Kakao/Apple account, and the name is whatever the
 * provider called them (a Kakao nickname is frequently not a real name).
 * This step closes that gap at the one moment the user is paying
 * attention.
 *
 * ─────────────────────────────────────────────────────────────────────
 * THE GATE IS "HAS A SOCIAL IDENTITY", *NOT* "IS MISSING A PHONE".
 * ─────────────────────────────────────────────────────────────────────
 *
 * That distinction is the whole safety property, and it was decided by
 * measurement rather than taste: 392 of 448 existing accounts (87.5%)
 * have a NULL phone. Gating on the missing field would put a wall in
 * front of nearly the entire user base — every parent at every academy —
 * on deploy day.
 *
 * Every pre-existing account is `email`-only (437 of 437 identities at
 * the time of writing), so keying on a non-email identity is
 * self-limiting by construction: it can only ever match accounts created
 * through a provider AFTER social login was switched on. No cutoff
 * timestamp is needed, and none should be added — a date is a thing that
 * rots, whereas "how did this account come to exist" does not.
 *
 * A password user who later LINKS a provider does gain a social
 * identity, and would match. That is intended: they still have no phone
 * on file, and they are by then an engaged user rather than a stranger
 * at the door. But note they keep `email` in the list too, which is why
 * the predicate asks whether ANY identity is non-email rather than
 * whether the FIRST one is.
 */

import { needsNamePrompt } from '@/lib/name'
import { isPlausiblePhone } from '@/lib/auth/phone'

/** Providers that count as "social" for this purpose. */
export const SOCIAL_PROVIDERS = ['google', 'kakao', 'apple'] as const

export interface OnboardingSubject {
  /** `app_metadata.providers` — every identity attached to the account. */
  providers: readonly string[] | null | undefined
  phone: string | null | undefined
  family_name?: string | null
  given_name?: string | null
  name_confirmed_at?: string | null
}

/** True when at least one attached identity is a social provider. */
export function hasSocialIdentity(providers: readonly string[] | null | undefined): boolean {
  if (!providers) return false
  return providers.some(p => (SOCIAL_PROVIDERS as readonly string[]).includes(p))
}

/**
 * Should this account be shown the blocking profile step?
 *
 * Pure, and deliberately so: it decides who is locked out of the app
 * until they type something, which is not a judgement to make inside a
 * component where it can only be exercised by clicking through a live
 * provider.
 */
export function needsSocialOnboarding(u: OnboardingSubject | null | undefined): boolean {
  if (!u) return false
  if (!hasSocialIdentity(u.providers)) return false
  // Missing EITHER piece is enough. The phone is the new requirement; the
  // name check reuses the existing predicate so this step and the older
  // name re-prompt cannot disagree about whether a name is settled.
  return !isPlausiblePhone(u.phone) || needsNamePrompt(u)
}

/**
 * What the provider already told us, for prefilling the form.
 *
 * Reads `user_metadata`, which is where Supabase deposits the provider's
 * profile. Shapes differ per provider and none of it is trustworthy — it
 * is a convenience for the user, never an authority. The values are
 * echoed back for confirmation, and whatever the user submits wins.
 *
 * PHONE: Google and Apple never send one. Kakao can, but only with the
 * `phone_number` consent item approved — until then this returns null
 * for every provider and the field is simply empty. Kakao delivers it as
 * `+82 10-1234-5678`, which normalizePhone() handles at the write side.
 */
export function prefillFromProvider(meta: Record<string, unknown> | null | undefined): {
  name: string | null
  phone: string | null
} {
  const m = meta ?? {}
  const str = (v: unknown): string | null => {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t.length > 0 ? t : null
  }

  // `full_name` is Google/Apple; `name` is the generic fallback;
  // `nickname`/`preferred_username` are what Kakao's profile_nickname
  // surfaces. Ordered most-real-name-first, because a nickname is the
  // least likely to be the name a teacher needs to see.
  const name =
    str(m.full_name) ??
    str(m.name) ??
    str(m.nickname) ??
    str(m.preferred_username) ??
    null

  const phone = str(m.phone_number) ?? str(m.phone) ?? null

  return { name, phone }
}
