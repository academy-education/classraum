/**
 * Central person-name helper.
 *
 * Before this file there was NO central name helper anywhere in the codebase:
 * one shared `maskName()`, three local helpers, and ~22 inline
 * reimplementations of `.split(' ')[0]`. Every read site invented its own
 * rule. This is the thing the earlier audit assumed already existed.
 *
 * THE DATA MODEL IS 성/이름, NOT first/last.
 *   family_name = 성  (Kim, 김)
 *   given_name  = 이름 (Younghee, 영희)
 * We store the ROLE, not the POSITION, because the position differs by
 * script: Korean renders 성이름 with no separator, Latin renders
 * "Given Family" with a space. A `first_name`/`last_name` pair cannot
 * express that without every read site guessing which convention applies.
 *
 * BOTH COLUMNS ARE NULLABLE AND 191 OF 444 ROWS ARE NULL. NULL means "the
 * split rule could not do this row — the user has been asked to re-enter".
 * Every function here MUST fall back to `users.name`, which stays NOT NULL
 * and stays authoritative. Never assume family_name is present.
 */

export interface NameFields {
  family_name?: string | null
  given_name?: string | null
  /** Authoritative single-string name. NOT NULL in the database. */
  name?: string | null
}

export type NameScript = 'hangul' | 'latin'

export type Relation = 'father' | 'mother' | 'guardian' | 'grandparent' | 'other'

/** Locale as used by LanguageContext ('english' | 'korean'), plus short forms. */
export type NameLocale = 'english' | 'korean' | 'en' | 'ko'

const HANGUL = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-퟿]/

/**
 * Script of a name fragment. Hangul wins if ANY Hangul codepoint is present:
 * a mixed string like "김Andy" is ordered the Korean way, which is what a
 * Korean-script surname implies.
 */
export function detectScript(value: string | null | undefined): NameScript {
  return value && HANGUL.test(value) ? 'hangul' : 'latin'
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** True when the split columns are usable. Both must be present. */
export function hasSplitName(u: NameFields | null | undefined): boolean {
  return !!u && clean(u.family_name).length > 0 && clean(u.given_name).length > 0
}

/**
 * Join a 성/이름 pair into the single display string for its script.
 * Korean: 김 + 영희 -> 김영희 (no separator).
 * Latin:  Lee + Andy -> Andy Lee (given first, space).
 */
export function joinName(familyName: string, givenName: string): string {
  const family = clean(familyName)
  const given = clean(givenName)
  if (!family) return given
  if (!given) return family
  return detectScript(family) === 'hangul' ? `${family}${given}` : `${given} ${family}`
}

/**
 * The display form. Falls back to `users.name` whenever the split columns
 * are NULL — which is 43% of rows, so this fallback is the common path, not
 * an edge case.
 */
export function displayName(u: NameFields | null | undefined): string {
  if (!u) return ''
  if (hasSplitName(u)) return joinName(u.family_name as string, u.given_name as string)
  return clean(u.name)
}

/**
 * Sort key. Family name first for split rows, whole string otherwise.
 *
 * NOTE: no call site uses this yet, deliberately. Moving rosters onto a
 * family-name sort visibly inverts the order of the 51 Latin-named users
 * (today they sort by given name), and the plan is explicit that this ships
 * as its own change so the reordering cannot be confounded with the split.
 */
export function sortKey(u: NameFields | null | undefined): string {
  if (!u) return ''
  if (hasSplitName(u)) {
    return `${clean(u.family_name)} ${clean(u.given_name)}`.toLocaleLowerCase()
  }
  return clean(u.name).toLocaleLowerCase()
}

/**
 * Avatar initial(s).
 *
 * Script-aware ON PURPOSE, and this is a deliberate refinement of the plan's
 * literal `family_name?.[0] ?? name[0]`. That spec is NOT behaviour-preserving
 * for Latin names: "Andy Lee" renders 'A' everywhere today, and keying off
 * family_name would silently flip every such avatar to 'L'. Taking the
 * leading character of the DISPLAY form reproduces today's output exactly
 * for both scripts — 김영희 -> 김, Andy Lee -> A — so the ~26 avatar sites can
 * be converted with no visible change.
 */
export function initials(u: NameFields | null | undefined): string {
  const shown = displayName(u)
  if (!shown) return ''
  if (detectScript(shown) === 'hangul') return shown[0]
  const tokens = shown.split(/\s+/).filter(Boolean)
  return (tokens[0]?.[0] ?? '').toUpperCase()
}

function isKoreanLocale(locale: NameLocale | null | undefined): boolean {
  return locale === 'korean' || locale === 'ko'
}

/**
 * Polite form of address. Korean appends 님; English has no equivalent
 * affix, so it returns the bare display name rather than inventing one.
 */
export function honorific(
  u: NameFields | null | undefined,
  locale: NameLocale = 'english'
): string {
  const shown = displayName(u)
  if (!shown) return ''
  return isKoreanLocale(locale) ? `${shown}님` : shown
}

/**
 * Apply the owner's split rule to a single free-typed string.
 *
 *   "in korean it would be the first name being the 2nd and 3rd character
 *    and the first character would be the last name (following korean name).
 *    Then the rest of the users, we can ask them to reenter their name if it
 *    is not possible."
 *
 * Returns null for everything the rule cannot do confidently — that null is
 * the signal to re-prompt, and callers must NOT substitute a guess for it.
 *
 * Cases returning null, each measured against the real 444-row table:
 *  - relationship labels ("강하준 아버지") — 150 rows. Not names. The first
 *    character is the CHILD's surname, so the rule produces a plausible and
 *    entirely wrong record.
 *  - single-token Latin ("Andy") — no surname exists to extract.
 *  - 3+ token Latin ("Sung Eun Kim") — the boundary is genuinely ambiguous.
 *  - 1-syllable Korean ("김") — would yield an empty 이름.
 *  - "다니엘" — a transliterated GIVEN name; the rule would split it 다/니엘.
 *
 * 2-syllable Korean IS split (김구 is a real name shape) but flagged via
 * `needsConfirmation`, because the rule cannot distinguish 김구 (성 + 1-char
 * 이름) from 서율 (a 2-char 이름 with the 성 missing) and neither can any script.
 */
export interface SplitResult {
  family_name: string
  given_name: string
  /** True when the split is a plausible guess the user should eyeball. */
  needsConfirmation: boolean
}

/** Given names that are transliterations and carry no surname. */
const TRANSLITERATED_GIVEN_NAMES = new Set(['다니엘'])

const RELATION_LABEL = /(아버지|어머니|아빠|엄마|보호자|학부모)$/

export function splitName(raw: string | null | undefined): SplitResult | null {
  const value = clean(raw)
  if (!value) return null

  if (detectScript(value) === 'hangul') {
    // A relationship label is not a name, no matter how it is spaced.
    if (RELATION_LABEL.test(value)) return null
    // Any internal whitespace in a Korean name means this is not the
    // simple 성 + 이름 shape the rule covers.
    if (/\s/.test(value)) return null
    if (!/^[가-힣]+$/.test(value)) return null
    if (TRANSLITERATED_GIVEN_NAMES.has(value)) return null

    const syllables = Array.from(value)
    if (syllables.length < 2) return null
    // 4+ syllables is ambiguous between a 복성 (남궁) and a 3-char 이름
    // (김빛나리). The bucket is empty in the real data (measured: zero rows
    // across every name column in the database), and the two-field form
    // lets such a user type it correctly with no detection logic at all.
    if (syllables.length > 3) return null

    return {
      family_name: syllables[0],
      given_name: syllables.slice(1).join(''),
      needsConfirmation: syllables.length === 2,
    }
  }

  const tokens = value.split(/\s+/).filter(Boolean)
  if (tokens.length !== 2) return null
  if (!/^[A-Za-z'-]+$/.test(tokens[0]) || !/^[A-Za-z'-]+$/.test(tokens[1])) return null

  // Stored Western order: given family.
  return { family_name: tokens[1], given_name: tokens[0], needsConfirmation: true }
}

/** True when this account should be asked to re-enter its name. */
export function needsNamePrompt(
  u: (NameFields & { name_confirmed_at?: string | null }) | null | undefined
): boolean {
  if (!u) return false
  return !hasSplitName(u) && !u.name_confirmed_at
}

/**
 * Display form for a guardian whose own name is not known (the 150 rows whose
 * `users.name` is a relationship label, and whose real name exists NOWHERE in
 * the database). Built from STRUCTURED fields, never by re-parsing the frozen
 * label string.
 */
export function guardianDisplayName(
  childName: string | null | undefined,
  relation: Relation | null | undefined,
  locale: NameLocale = 'english'
): string {
  const child = clean(childName)
  const ko = isKoreanLocale(locale)
  const koLabel: Record<Relation, string> = {
    father: '아버지',
    mother: '어머니',
    guardian: '보호자',
    grandparent: '조부모',
    other: '보호자',
  }
  const enLabel: Record<Relation, string> = {
    father: "'s father",
    mother: "'s mother",
    guardian: "'s guardian",
    grandparent: "'s grandparent",
    other: "'s guardian",
  }
  const rel = relation ?? 'guardian'
  if (!child) return ko ? koLabel[rel] : enLabel[rel].replace("'s ", '')
  return ko ? `${child} 학생 ${koLabel[rel]}` : `${child}${enLabel[rel]}`
}

/**
 * Field-level validation for the two-input form.
 *
 * `validation.nameTooShort` ("최소 2자") MUST NOT apply to 성. A 1-character
 * 성 is the normal Korean case — 111 of 444 accounts are 김 — so reusing the
 * old single-field rule would fail validation for nearly every Korean user.
 * Returns a translation KEY or null, so the caller owns the wording.
 */
export const FAMILY_NAME_MAX = 40
export const GIVEN_NAME_MAX = 40

export function validateFamilyName(value: string | null | undefined): string | null {
  const v = clean(value)
  if (!v) return 'validation.familyNameRequired'
  if (detectScript(v) === 'hangul') {
    // 1-2 characters. Two is what makes 남궁/선우/황보 typeable without any
    // compound-surname detection: the user simply types both syllables.
    if (Array.from(v).length > 2) return 'validation.familyNameTooLongKo'
  } else if (v.length > FAMILY_NAME_MAX) {
    return 'validation.familyNameTooLong'
  }
  return null
}

export function validateGivenName(value: string | null | undefined): string | null {
  const v = clean(value)
  if (!v) return 'validation.givenNameRequired'
  if (v.length > GIVEN_NAME_MAX) return 'validation.givenNameTooLong'
  return null
}

/**
 * Build the payload for any writer of a name. `users.name` is written in the
 * SAME statement as the split columns, always — it stays authoritative, it is
 * the fallback for every NULL row, and it is what all 8 PortOne call sites
 * pass to the card issuer.
 */
export function buildNameUpdate(familyName: string, givenName: string): {
  family_name: string
  given_name: string
  name: string
  name_confirmed_at: string
} {
  const family = clean(familyName)
  const given = clean(givenName)
  return {
    family_name: family,
    given_name: given,
    name: joinName(family, given),
    name_confirmed_at: new Date().toISOString(),
  }
}
