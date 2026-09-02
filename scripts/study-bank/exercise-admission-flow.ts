/**
 * Drive one SSAT/ISEE section end to end against the LIVE bank, and
 * check the number the student would see.
 *
 * WHY THIS EXISTS. Every layer under the result screen has unit tests —
 * scoreAdmission's -1/4 arithmetic, familyFromTopicSlug's routing, the
 * SECTION_TOPIC uuids. None of them draws a real form. CLAUDE.md's rule
 * is that a unit test is not evidence until it has been run against real
 * data, and twice in this project the units passed while the live bank
 * was wrong.
 *
 * WHAT IT DOES NOT COVER, stated so nobody reads more into a pass than
 * is there: it does not render the result screen, does not exercise the
 * HTTP route, credit reservation or the coverage gate, and does not log
 * in. It covers draw -> answer -> score, which is the wiring that decides
 * the number.
 *
 * Read-only apart from nothing: it writes no rows at all.
 *
 * Run:  DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config \
 *         scripts/study-bank/exercise-admission-flow.ts
 */
import { assembleAdmissionSection } from '../../src/lib/study/assemble'
import {
  ADMISSION_BLUEPRINT, scoreAdmission, admissionFormTotals,
} from '../../src/lib/study/admission-tests'
import { familyFromTopicSlug } from '../../src/lib/study/test-result'
import { SECTION_TOPIC } from '../../src/lib/study/section-topics'

type Fam = 'ssat' | 'isee'

async function run() {
  let failures = 0
  const fail = (m: string) => { console.log(`   FAIL  ${m}`); failures++ }

  for (const family of ['ssat', 'isee'] as Fam[]) {
    const totals = admissionFormTotals(family)
    console.log(`\n=== ${family.toUpperCase()}  (${totals.questions} Q / ${totals.minutes} min per form) ===`)

    for (const block of ADMISSION_BLUEPRINT[family]) {
      if (!block.bankSection) continue

      const drawn = await assembleAdmissionSection(
        { family, sectionKey: block.key }, `exercise-${family}-${block.key}`)
      const rows = drawn.questions ?? []

      const label = `${block.key}`.padEnd(9)
      if (rows.length !== block.questions) {
        fail(`${label} drew ${rows.length}, blueprint wants ${block.questions}`)
        continue
      }

      /* Every drawn item must have a key that is one of its own options.
         A key that is not among the choices scores as wrong for a student
         who picked correctly — invisible to any count-based check. */
      const orphanKeys = rows.filter(q => {
        const ch = q.choices
        return Array.isArray(ch) && ch.length > 0 && !ch.includes(q.correct_answer)
      })
      if (orphanKeys.length) fail(`${label} ${orphanKeys.length} item(s) whose key is not among their options`)

      /*
       * Identity is prompt + passage, NOT prompt alone. Reading stems
       * are meant to repeat: "The passage is chiefly concerned with"
       * appears on 12 SSAT items, each against a DIFFERENT passage, and
       * that is how the section is written. A prompt-only check called
       * all of that a defect — the fourth time in this project that a
       * checker condemned sound items, so the rule is the same one:
       * make the detector reproduce a known-good case before pointing
       * it at unknowns.
       */
      const ident = (q: typeof rows[number]) => `${q.passageGroupId ?? ''}::${q.prompt}`
      const dupes = rows.length - new Set(rows.map(ident)).size
      if (dupes) fail(`${label} ${dupes} item(s) repeated (same prompt AND same passage) on one form`)

      /* Simulate a student: right on the first 40%, wrong on the next
         30%, blank for the rest — so the SSAT penalty and the ISEE
         rights-only rule produce DIFFERENT numbers and a mix-up shows. */
      const n = rows.length
      const correct = Math.floor(n * 0.4)
      const wrong = Math.floor(n * 0.3)
      const omitted = n - correct - wrong
      const score = scoreAdmission(family, { correct, wrong, omitted })

      const expectedRaw = family === 'ssat' ? correct - wrong / 4 : correct
      if (Math.abs(score.raw - expectedRaw) > 1e-9) {
        fail(`${label} raw ${score.raw}, expected ${expectedRaw}`)
      }
      if (score.scaled !== null || score.stanine !== null) {
        fail(`${label} reported a scaled score or stanine; both must be null`)
      }

      const topicId = SECTION_TOPIC[family]?.[block.key]
      if (!topicId) fail(`${label} no SECTION_TOPIC entry`)

      console.log(`   ok  ${label} drew ${String(n).padStart(2)}  ` +
        `${correct}R/${wrong}W/${omitted}blank -> raw ${score.raw}` +
        (family === 'ssat' ? `  (penalty -${(wrong / 4).toFixed(2)})` : '  (rights-only)'))
    }
  }

  /* The routing that decides WHICH of the two rules above runs. */
  console.log('\n=== family routing ===')
  for (const [slug, want] of [
    ['ssat-math', 'ssat'], ['ssat-reading', 'ssat'],
    ['isee-math-achievement', 'isee'], ['sat-math', 'sat'], ['toefl-reading', 'toefl'],
  ] as [string, string][]) {
    const got = familyFromTopicSlug(slug)
    if (got !== want) fail(`${slug} routed to ${got}, expected ${want}`)
    else console.log(`   ok  ${slug.padEnd(24)} -> ${got}`)
  }

  console.log(failures ? `\n${failures} FAILURE(S)` : '\nEvery section draws a full form and scores by its own rule.')
  process.exit(failures ? 1 : 0)
}

run().catch(e => { console.error(e); process.exit(1) })
