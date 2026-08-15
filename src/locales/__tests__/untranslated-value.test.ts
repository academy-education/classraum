/**
 * THE GAP key-parity.test.ts LEAVES OPEN.
 *
 * That file proves every English key EXISTS in Korean. It says nothing
 * about what the key holds. Deleting `study.onboarding.skip` from
 * ko.json fails two of its tests; setting it to the string "Skip"
 * fails none — and "Skip" is exactly what a Korean student would then
 * read on the button.
 *
 * That is not hypothetical: a missing key is loud (the raw key renders,
 * or the fallback is obvious), whereas an English VALUE renders as
 * confident, plausible, wrong-language UI that only a Korean reader
 * notices. It is the quieter of the two failures and was the unguarded
 * one.
 *
 * The rule: a Korean value identical to its English source, containing
 * a real word and no Hangul at all, is presumed untranslated.
 *
 * ── Why the exemptions are shaped this way ───────────────────────────
 * Two of them are automatic, because they are decidable:
 *   · a value that is nothing but interpolation ("{summary}",
 *     "{current}/{max}") has no prose to translate;
 *   · a value with no lower-case run at all ("JSON", "CLASSRAUM") is an
 *     acronym or a wordmark, not a sentence.
 * Everything else needs a human reason, so it goes in the list below
 * and must carry one. The list is capped: if it starts growing, that is
 * the signal that translation is slipping, and the cap is what turns
 * that into a failure instead of a longer list.
 */
import en from '../en.json'
import ko from '../ko.json'

/**
 * Key prefixes whose Korean value is CORRECTLY identical to English.
 * `reason` is required and enforced to be substantive — an entry nobody
 * can justify in a sentence does not belong here.
 */
const LEGITIMATELY_IDENTICAL: readonly { prefix: string; reason: string }[] = [
  {
    prefix: 'landing.camp.toefl.q.',
    reason:
      'Demo content on the marketing camp page: a real TOEFL Reading item (passage + four options) from the live bank. TOEFL is an English exam — showing the material in Korean would misrepresent the product a school is evaluating.',
  },
  {
    prefix: 'landing.camp.toefl.skillsDemo.',
    reason:
      'Same page, same rule: the listening options, the speaking sentence a student repeats, and the writing draft are the actual English exam materials the product delivers. Only the surrounding labels are localised, and they are.',
  },
  {
    prefix: 'settings.languageRegion.languages.',
    reason:
      'A language is named in its OWN language in a language picker — English, Español, Français. Translating these into Korean would make the picker unusable for the very person looking for their language.',
  },
  {
    prefix: 'settings.connectedDevices.devices.',
    reason:
      'Hardware model names ("MacBook Pro", "iPhone 14") are proper nouns that Apple ships untranslated in Korean too; a student matching this against their own device settings needs the literal string.',
  },
  {
    prefix: 'students.jsonFormat',
    reason:
      'A file format name. The export dialog has to match the extension the student actually receives, and .json is not localised.',
  },
  {
    prefix: 'students.xlsxFormat',
    reason:
      'Same as jsonFormat — "Excel" is the product name of the application that opens the file, and Korean Office ships under that name.',
  },
  {
    prefix: 'reports.studentEmail',
    reason:
      'A placeholder e-mail address shown greyed in an input. It is sample data illustrating the FORMAT, not prose, and a Korean address would illustrate the same format no better.',
  },
  {
    prefix: 'landing.home.unify.mod6',
    reason:
      'The student app module is called "Study" in Korean copy too — see chip6 "Study · 학생 앱" and flow2t "시험 성적 → AI 피드백 → Study 복습". Translating only this one label would make the diagram disagree with its own caption.',
  },
]

function flatten(o: unknown, prefix = '', out: Record<string, unknown> = {}) {
  for (const [k, v] of Object.entries((o ?? {}) as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object') flatten(v, key, out)
    else out[key] = v
  }
  return out
}

const EN = flatten(en)
const KO = flatten(ko)

/** Interpolation only — nothing here is language. */
const isPurePlaceholder = (s: string) => !/[A-Za-z]{4,}/.test(s.replace(/\{[^}]*\}/g, ''))
/** No lower-case run: an acronym or a wordmark, not a sentence. */
const isWordmark = (s: string) => !/[a-z]{2,}/.test(s)

const exempt = (key: string) => LEGITIMATELY_IDENTICAL.some(e => key.startsWith(e.prefix))

/** Korean value === English value, holds a real word, has no Hangul. */
function suspects(): string[] {
  return Object.keys(EN).filter(k => {
    const e = EN[k]
    const v = KO[k]
    if (typeof e !== 'string' || typeof v !== 'string') return false
    if (e !== v) return false
    if (!/[A-Za-z]{4,}/.test(e)) return false
    if (/[가-힣]/.test(v)) return false
    return !isPurePlaceholder(e) && !isWordmark(e) && !exempt(k)
  })
}

describe('Korean values are actually Korean', () => {
  it('no key is left holding its English string', () => {
    // The message matters: whoever trips this needs to know both fixes
    // (translate it, or justify it below) without reading this file.
    const found = suspects().map(k => `${k} = ${JSON.stringify(EN[k])}`)
    expect(found).toEqual([])
  })

  it('every exemption still matches something', () => {
    // An exemption for a key that no longer exists is dead weight that
    // silently widens the hole for whatever key is added at that prefix
    // later.
    const unused = LEGITIMATELY_IDENTICAL.filter(
      e => !Object.keys(EN).some(k => k.startsWith(e.prefix)),
    ).map(e => e.prefix)
    expect(unused).toEqual([])
  })

  it('every exemption carries a real justification', () => {
    for (const { prefix, reason } of LEGITIMATELY_IDENTICAL) {
      expect(prefix.length).toBeGreaterThan(0)
      expect(reason.length).toBeGreaterThan(60)
    }
  })

  it('the exemption list stays short', () => {
    // Same reasoning as key-parity's cap. This list growing is the
    // symptom worth failing on — each entry individually looks
    // reasonable, which is how the list gets long.
    expect(LEGITIMATELY_IDENTICAL.length).toBeLessThanOrEqual(8)
  })
})
