/**
 * check-kind-joins.mjs — per-QUESTION-KIND option-shape joins.
 *
 * WHY: on 2026-08-28 the first SSAT/ISEE Reading pilots died at +58.3
 * and +61.1 — blind solvers answered 9 of 10 questions with no passage.
 * The cause was the BRIEF: every author was given the same six question
 * kinds, so each slot grew its own rule. The loudest, firing 4/4:
 * on tone/attitude questions the key was always the option carrying an
 * internal qualifier ("qualified respect", "wry fondness deepening
 * into...") while distractors were affectively extreme.
 *
 * check-batch-joins.mjs cannot see this: it measures families across a
 * whole batch, and this defect lives WITHIN a question kind. So this
 * script groups by `kind` and, for each shape feature, asks whether the
 * key carries it more often than chance.
 *
 * Features are deliberately cheap and semantic-adjacent:
 *   hedged      internal qualifier / concessive movement
 *   absolute    all/never/entirely/purely/uncritical...
 *   longest     the longest option in its set
 *   shortest    the shortest option
 *
 * Usage:
 *   node check-kind-joins.mjs <items.json>   # [{id, kind, choices, correct_answer}]
 *   node check-kind-joins.mjs --selftest
 *
 * Verdict: within any kind with >= 4 items, a feature whose key rate
 * exceeds chance by more than SKEW_BAR items is a FAIL. Exit 1 on fail.
 *
 * *** HONEST LIMIT — READ BEFORE TRUSTING A PASS ***
 * Break-tested against the killed reading pilot (the batch it was built
 * from) it reports CLEAN. It does not reproduce a +58 attack margin, so
 * it is NOT a gate. The reason is the register's standing lesson: the
 * qualifier that marked those keys also appears in distractors, and the
 * real discriminator is semantic. This is the SIXTH cheap structural
 * proxy attempted in this repo and, like the previous five, it does not
 * rank batches.
 *
 * *** BUT IT HAS ONE-SIDED VALIDITY, AND THAT IS WHY IT STAYS ***
 * On its first real run after the failed break-test it caught a genuine
 * defect the batch-level joins missed: in reading-v2 the key was the
 * LONGEST option on inference (8/14), main idea (8/20) and organization
 * (8/14) questions. The batch-wide key-longest rate was 38%, under the
 * established 45% bar, so the population number hid a per-kind
 * concentration of 40-57%. Read the asymmetry literally:
 *   a FAIL here is informative — it found a real length tell;
 *   a PASS here proves nothing — it passed the batch that died at +58.
 * Keep it as pre-flight reporting — it does catch
 * gross within-kind skew (its self-test fixture) and it surfaces the
 * fragmented-kind-label defect. THE BLIND ATTACK REMAINS THE GATE for
 * reading. Do not build a seventh proxy.
 */
import { readFileSync } from 'node:fs'

const SKEW_BAR = 2.5

const KIND_ALIASES = [
  [/tone|attitude/i, 'tone'],
  [/main[ _-]?idea|central (purpose|idea)/i, 'main idea'],
  [/vocab/i, 'vocabulary in context'],
  [/technique|author'?s? purpose|function/i, 'author technique'],
  [/detail/i, 'stated detail'],
  [/inference|infer/i, 'inference'],
]
export function normalizeKind(raw) {
  const s = String(raw || 'unspecified')
  for (const [re, canon] of KIND_ALIASES) if (re.test(s)) return canon
  return s.toLowerCase().trim()
}

const FEATURES = [
  ['hedged', c => /\b(qualified|tempered|measured|partly|somewhat|though|yet|while|without\b.*\b(being|becoming)|deepening|shading|mixed with|tinged)\b/i.test(c)],
  ['absolute', c => /\b(all|every|never|always|entirely|purely|wholly|uncritical|unreserved|total|complete(ly)?|no\b.*\bwhatever)\b/i.test(c)],
  ['longest', (c, set) => c.length === Math.max(...set.map(x => x.length))],
  ['shortest', (c, set) => c.length === Math.min(...set.map(x => x.length))],
]

export function run(items) {
  const byKind = {}
  for (const it of items) {
    // Kind labels are author free-text and fragment badly ("tone" vs
    // "tone/attitude" vs "attitude"), which halves every group and hides
    // skew below the measurement threshold. Normalize before grouping.
    const k = normalizeKind(it.kind)
    ;(byKind[k] = byKind[k] || []).push(it)
  }
  const fails = [], warns = []
  for (const [kind, group] of Object.entries(byKind)) {
    if (group.length < 4) { warns.push(`${kind}: only ${group.length} items — not measured`); continue }
    for (const [name, test] of FEATURES) {
      let keyHas = 0, chance = 0, present = 0
      for (const it of group) {
        const set = it.choices || []
        const marked = set.filter(c => test(c, set))
        if (!marked.length || marked.length === set.length) continue
        present++
        chance += marked.length / set.length
        if (test(it.correct_answer, set)) keyHas++
      }
      if (present < 4) continue
      const delta = keyHas - chance
      const line = `${kind} / ${name}: present ${present}, key ${keyHas}, chance ${chance.toFixed(1)} (delta ${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`
      if (Math.abs(delta) > SKEW_BAR) fails.push(line)
      else warns.push(line)
    }
  }
  return { fails, warns }
}

function selftest() {
  // The measured reading-pilot shape: on tone items the key always hedges.
  const bad = Array.from({ length: 6 }, (_, i) => ({
    id: 'T' + i, kind: 'tone',
    choices: [`qualified respect for the ${i} finding`, `unreserved praise`, `total contempt`, `complete indifference`],
    correct_answer: `qualified respect for the ${i} finding`,
  }))
  // A balanced set: every option hedges, so the feature cannot discriminate.
  const good = Array.from({ length: 6 }, (_, i) => ({
    id: 'G' + i, kind: 'tone',
    choices: [`qualified respect (${i})`, `measured doubt (${i})`, `tempered enthusiasm (${i})`, `partly amused scepticism (${i})`],
    correct_answer: [`qualified respect (${i})`, `measured doubt (${i})`, `tempered enthusiasm (${i})`, `partly amused scepticism (${i})`][i % 4],
  }))
  const r1 = run(bad), r2 = run(good)
  if (!r1.fails.some(f => f.includes('hedged'))) { console.error('SELFTEST FAIL: hedged-key skew not caught'); process.exit(1) }
  if (r2.fails.length) { console.error('SELFTEST FAIL: balanced set flagged —', r2.fails); process.exit(1) }
  console.log('selftest OK — catches within-kind key-shape skew, passes a balanced set')
}

const arg = process.argv[2]
if (arg === '--selftest') { selftest(); process.exit(0) }
if (!arg) { console.error('usage: check-kind-joins.mjs <items.json> | --selftest'); process.exit(1) }
const { fails, warns } = run(JSON.parse(readFileSync(arg, 'utf8')))
for (const w of warns) console.log(`  ok  ${w}`)
if (fails.length) { console.error('\nFAIL:'); for (const f of fails) console.error('  - ' + f); process.exit(1) }
console.log('\nper-kind joins clean')
