import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A UNIT GLUED ONTO A NUMBER IN JSX, WITH NO KOREAN BRANCH.
 *
 * untranslated-value.test.ts guards locale VALUES, and key-parity guards
 * locale KEYS. Neither can see this defect, because the offending string
 * never reaches a locale file at all — it is built in the component:
 *
 *     value={`${defaults.minutes}m`}        // TestCustomizationSheet
 *     value={`${totalMinutes}m`}            // session summary
 *
 * Both rendered "35m" under a Korean label 시간 / 제한 시간. Both shipped.
 * Both were reported by the user, not by the suite, because every
 * existing i18n check was looking at the wrong artifact.
 *
 * ── What counts as a violation ───────────────────────────────────────
 * A template literal whose interpolation is immediately followed by a
 * bare English unit, on a line carrying no Korean at all.
 *
 * The `ko ? \`${m}분\` : \`${m}m\`` form is NOT a violation. It is not
 * how we would prefer to write it — the locale files should own the
 * string — but it does render Korean to Korean readers, which is the
 * thing that matters to a student. Flagging it here would bury the two
 * real breakages in a list of stylistic nits, and a check that cries
 * wolf gets muted.
 */

const ROOTS = ['src/app/mobile/study', 'src/components/ui/mobile']
const UNIT = /`\$\{[^`}]*\}(m|s|h|d|min|mins|minutes|hr|hrs|sec|secs)`/

/**
 * The Korean sibling: any Hangul on the same line.
 *
 * The FIRST version of this rule excluded any line containing `t(`, and
 * it silently missed the very bug it was written for —
 *
 *     <Stat value={`${totalMinutes}m`} label={translatedLabel} />
 *
 * because the LABEL is translated on the same line as the hardcoded
 * VALUE. Reverting the fix left the check green, which is the only
 * reason the flaw surfaced. Presence of a translation call somewhere on
 * a line says nothing about the string next to it.
 *
 * Hangul is the right signal instead: every correctly-branched case
 * (`ko ? \`${m}분\` : \`${m}m\``) carries its Korean variant on the same
 * line, and both real bugs had no Korean anywhere near them.
 */
const HAS_KOREAN = /[ㄱ-힝]/

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue
      out.push(...walk(p))
    } else if (/\.tsx?$/.test(name)) out.push(p)
  }
  return out
}

function violations(): string[] {
  const hits: string[] = []
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
        if (UNIT.test(line) && !HAS_KOREAN.test(line)) hits.push(`${file}:${i + 1}  ${line.trim()}`)
      })
    }
  }
  return hits
}

describe('hardcoded units in study UI', () => {
  it('has none', () => {
    // Prints the offending lines rather than just a count — a failure
    // here should be actionable without re-running a grep by hand.
    expect(violations()).toEqual([])
  })

  it('would catch the two that actually shipped', () => {
    // The check is only worth its runtime if it fires on the real bugs.
    // These are the exact lines that were live in production.
    const shipped = [
      'value={`${defaults.minutes}m`}',
      // Note the translated LABEL sitting on the same line as the
      // hardcoded VALUE — this is the shape that defeated the first rule.
      "<Stat icon={Clock} value={`${totalMinutes}m`} label={String(t('study.summary.timeLabel'))} />",
    ]
    for (const line of shipped) {
      expect(UNIT.test(line)).toBe(true)
      expect(HAS_KOREAN.test(line)).toBe(false)
    }
  })

  it('does not fire on a correctly branched ternary', () => {
    // These render Korean properly. Flagging them would drown the real
    // failures, so the check deliberately lets them through.
    const fine = [
      'label: ko ? `${m}분` : `${m}m`',
      '{ko ? `${remaining}초` : `${remaining}s`}',
      "value={String(t('study.summary.timeValue', { minutes: totalMinutes }))}",
    ]
    for (const line of fine) {
      expect(UNIT.test(line) && !HAS_KOREAN.test(line)).toBe(false)
    }
  })
})
