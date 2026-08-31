/**
 * check-slot-type.mjs — the odd-category slot.
 *
 * PROPOSED BY THE CROSS-VARIANT REVIEWER ON s4, from the pattern in its
 * own failures. It judged 84 questions, failed 7, and observed that the
 * mechanical negation template produces valid kills every time the five
 * slot values are the SAME KIND of thing, and breaks precisely when one
 * value is a different kind from the other four:
 *
 *     S11    a DESIRE among four checkable facts
 *     S14-6  a RELATION-TO-AN-AUTHORITY among four permissions
 *     S17-1  a NULL HYPOTHESIS among four causes
 *     S12-5  a DIFFERENT OBJECT among four attitudes
 *
 * The failure mechanism is the same in each: the author writes a
 * parallel-looking denial, but a denial of a fact does not refute a
 * desire, and a denial of a permission does not refute a relation. Worse,
 * on S14-6 the denial BACKFIRED — "It wants dancers of sixty" beside "The
 * company is young" makes the sibling's option TRUE.
 *
 * So this is a cheap pre-flight for a defect that until now only a full
 * semantic review could find.
 *
 *   node check-slot-type.mjs <topics.json> [...]
 *   node check-slot-type.mjs --selftest
 *
 * IT DOES NOT WORK WELL ENOUGH TO CHANGE A DECISION. Measured against
 * the very batch whose failures suggested it:
 *
 *     known cross-variant failures      7
 *     caught by this check              4   (S11-1, S11-3, S17-1, S19-3)
 *     missed                            3   (S11-2, S12-5, S14-6)
 *     flagged that were NOT failures   11
 *
 * Precision 27%, recall 57%. As a gate it would drop eleven sound
 * questions to catch four bad ones. As triage it saves nothing either,
 * because the semantic reviewer reads every span regardless and a hint
 * that misses three of seven cannot narrow what must be read in full.
 *
 * This is the EIGHTH structural proxy on this project and it fails the
 * same way as the previous seven: the defect is semantic and
 * item-specific, and a lexical category-guess is not a cheap stand-in
 * for reading. Kept, documented, and scored so nobody builds a ninth on
 * the same idea — the same service OPTION-BALANCE-RESULT.md performs.
 *
 * The OBSERVATION behind it is still correct and worth keeping in the
 * authoring brief: when one of the five slot values is a different KIND
 * of thing from the other four, the mechanical negation template breaks,
 * and it can even backfire into affirming the sibling. Tell authors
 * that. Do not try to detect it with a regex.
 */
import { readFileSync } from 'node:fs'

/**
 * Categories are matched on the ANSWER text, which is what the kill has
 * to defeat. Ordered: the first match wins, so the more specific
 * patterns come first.
 */
const CATEGORIES = [
  ['null-hypothesis', /\b(survived|withstood|held up|genuine|honest|nothing (?:was|had)|no (?:fault|error|flaw)|stood up|was sound|kept|unchanged)\b/i],
  ['mental-state',    /\b(wanted|wished|hoped|feared|believed|preferred|meant to|intended|was willing|refused because he|refused because she)\b/i],
  ['relation-to-authority', /\b(departs? from|goes? against|conflicts? with|honou?rs|obeys|follows its author|contrary to|at odds with)\b/i],
  ['permission',      /\b(leaves? .* (?:open|to the)|allows|permits|gives .* no say|is fixed|left open)\b/i],
  ['attitude',        /\b(approval|admiration|praise|regret|impatience|annoyance|amusement|puzzlement|surprise|enthusiasm|disapproval|support|untroubled|indignation)\b/i],
]

const categorise = t => {
  for (const [name, re] of CATEGORIES) if (re.test(String(t))) return name
  return 'fact'
}

export function run(topics) {
  const hits = []
  let checked = 0

  for (const t of topics) {
    for (const q of t.questions ?? []) {
      const answers = (t.variants ?? [])
        .map(v => (v.answers ?? []).find(a => a.qid === q.qid))
        .filter(Boolean)
      if (answers.length < 4) continue
      checked++

      const cats = answers.map(a => categorise(a.answer))
      const count = {}
      for (const c of cats) count[c] = (count[c] ?? 0) + 1

      // The defect shape is ONE odd value against a uniform majority. Two
      // categories at 2/3 apiece is a differently-shaped question, not
      // this defect, and flagging it would bury the real signal.
      const entries = Object.entries(count).sort((a, b) => b[1] - a[1])
      if (entries.length < 2) continue
      const [majority, majN] = entries[0]
      const odd = entries.filter(([, n]) => n === 1)
      if (majN >= answers.length - 1 && odd.length === 1) {
        const [oddCat] = odd[0]
        const idx = cats.indexOf(oddCat)
        hits.push({
          qid: q.qid,
          topic: t.topic_id,
          variant: t.variants[idx]?.label ?? '?',
          oddCategory: oddCat,
          majority,
          answer: String(answers[idx].answer).slice(0, 70),
        })
      }
    }
  }
  return { hits, checked }
}

function selftest() {
  const mk = answers => ([{
    topic_id: 'RW9-S01',
    questions: [{ qid: 'q1' }],
    variants: answers.map((a, i) => ({
      label: 'W' + (i + 1), passage: 'p',
      answers: [{ qid: 'q1', answer: a }],
    })),
  }])

  // A desire among four facts — the S11 shape. Must be caught.
  const desire = run(mk([
    'the reed on the instrument was dead',
    'his hands were blistered from the harvest',
    'the strap had broken that morning',
    'the tune was one he had never learned',
    'he wanted Dumitra to play instead',
  ]))
  if (!desire.hits.some(h => h.oddCategory === 'mental-state')) {
    console.error('SELFTEST FAIL: a desire among facts was not caught', desire.hits); process.exit(1)
  }

  // A null hypothesis among four causes — the S17-1 shape.
  const nul = run(mk([
    'how a warm summer falsified a river record',
    'how a broken gauge falsified a river record',
    'how a moved station falsified a river record',
    'how a clerical slip falsified a river record',
    'how a river record survived its tests',
  ]))
  if (!nul.hits.some(h => h.oddCategory === 'null-hypothesis')) {
    console.error('SELFTEST FAIL: a null hypothesis among causes was not caught', nul.hits); process.exit(1)
  }

  // Five values of the same kind must NOT be flagged — otherwise the
  // check fires on every question and tells nobody anything.
  const uniform = run(mk([
    'salt soaking down from the winter road',
    'elk browsing the young shoots',
    'a fungus carried on the wind',
    'a drought in the third summer',
    'a change in the water table',
  ]))
  if (uniform.hits.length) {
    console.error('SELFTEST FAIL: a uniform slot was flagged', uniform.hits); process.exit(1)
  }

  console.log('selftest OK — catches a desire among facts and a null among causes; leaves a uniform slot alone')
}

const args = process.argv.slice(2)
if (args[0] === '--selftest') { selftest(); process.exit(0) }
if (!args.length) { console.error('usage: check-slot-type.mjs <topics.json> [...] | --selftest'); process.exit(1) }
const topics = args.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
const { hits, checked } = run(topics)
console.log(`${checked} questions typed across ${topics.length} topics`)
if (!hits.length) { console.log('no odd-category slots'); process.exit(0) }
console.log(`\n${hits.length} question(s) where ONE answer is a different kind from the other four:`)
for (const h of hits) {
  console.log(`  ${h.qid} ${h.variant}: ${h.oddCategory} among ${h.majority} — "${h.answer}…"`)
}
console.log('\nAdvisory. Hand these to the semantic reviewer; a kill that denies a')
console.log('fact does not refute a desire, and may even affirm it.')
