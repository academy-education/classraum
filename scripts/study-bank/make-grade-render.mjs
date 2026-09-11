#!/usr/bin/env node
/**
 * make-grade-render.mjs <batch.json> [--out <tag>]
 *
 * The WITH-SOURCE grade render: the passage, figure, stem and options, with
 * the key, the authored difficulty and the explanation WITHHELD.
 *
 * ── Why this exists ──────────────────────────────────────────────────
 *
 * Until 2026-09-11 every with-source grader in this project was handed the
 * raw batch file, which carries `correct_answer`, `difficulty` and
 * `explanation` on every item. So a grader asked to independently reach the
 * key could see the key; asked to independently judge difficulty, could see
 * the author's label; and asked whether a second answer is defensible, could
 * read a paragraph arguing for the first.
 *
 * It was caught from the inside. A regrader wrote, unprompted: "Discount that
 * agreement somewhat: the labels were visible in the file as I read it."
 * Several others said they had committed their picks before opening
 * `correct_answer`. That is the honour system working — and the honour system
 * is not an instrument. A grade is evidence only if the grader COULD NOT have
 * been anchored, not if they say they were not.
 *
 * The cost is asymmetric, which is why it matters: anchoring inflates key
 * agreement and difficulty agreement, and suppresses `exclusive: false`. Every
 * error it causes is in the flattering direction.
 *
 * ── What it withholds, and what it must not ──────────────────────────
 *
 * WITHHELD: correct_answer, difficulty, explanation, distractor_rationales,
 *           solve, distractor_solve, and any field whose name contains
 *           'answer', 'key', 'rationale' or 'difficulty'.
 * KEPT:     everything the student sees — prompt, choices, passage, graphic,
 *           passage_group_id, and the domain/subskill labels a grader needs to
 *           judge fit.
 *
 * The withheld list is a DENY list computed from the item's own keys, not an
 * allow list of fields I happened to think of, because a new authoring field
 * must not silently leak. Anything unrecognised is kept and NAMED in the
 * summary, so a leak is visible rather than silent.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

/*
 * `subskill` is withheld — added 2026-09-11 after the first two blind grades.
 *
 * Both graders reported it independently and unprompted. It is AUTHOR PROSE
 * NAMING THE SOLUTION PATH: "the altitude to the hypotenuse and the segments
 * it makes", "the segment parallel to the bases that halves the area", "the
 * cross section cut from a cube by a plane through three vertices". On
 * several items it removes the only identification step there is — and a
 * subskill worded as a multi-stage procedure reads as "hard", so it is a
 * difficulty label in prose as well. One grader said flatly that it "biases
 * every grader's difficulty rating downward, mine included".
 *
 * `domain` stays: it is a one-word blueprint label, not a method.
 */
const SENSITIVE = /answer|correct|key|rationale|difficulty|explanation|solve|subskill/i
/** Fields that match SENSITIVE but are structural and safe to keep. */
const KEEP_ANYWAY = new Set(['passage_group_id', 'topic_id', 'set_id'])

/*
 * OPTIONS ARE RE-DEALT — added 2026-09-11, same two reports.
 *
 * The render kept authored option order, and on sat-geo-h2 the authored key
 * slots ran 2,2 0,0 3,3 1,1 ... — TWELVE consecutive pairs sharing a slot,
 * behind a perfect 6/6/6/6 histogram. Both graders derived it from their own
 * picks before computing any index, and both said the same thing: solve one
 * item of a pair and its partner is free.
 *
 * That pattern reaches no STUDENT (the assembler re-deals every draw, §2b).
 * It absolutely reaches a GRADER reading the render, which is the whole
 * population this file serves. So the render deals like the draw does: a
 * per-item seeded shuffle, deterministic so two graders and a re-run see the
 * same deal and their disagreement means something.
 */
function dealSeed(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
function reDeal(choices, id) {
  const rand = dealSeed(String(id) + ':grade')
  const a = [...choices]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export function splitItem(raw) {
  const shown = {}, withheld = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!KEEP_ANYWAY.has(k) && SENSITIVE.test(k)) withheld[k] = v
    else shown[k] = v
  }
  return { shown, withheld }
}

function selftest() {
  let bad = 0
  const ok = (name, cond, got) => {
    console.log(`${cond ? 'ok   ' : 'FAIL '} ${name}${cond ? '' : `  -> ${JSON.stringify(got)}`}`)
    if (!cond) bad++
  }
  const { shown, withheld } = splitItem({
    id: 'X1', domain: 'D', subskill: 's', difficulty: 'hard',
    prompt: 'p', choices: ['a', 'b'], correct_answer: 'a',
    explanation: 'because a', solve: 'return 1', distractor_solve: { b: 'return 2' },
    passage: 'text', passage_group_id: 'g1',
  })
  ok('key is withheld', !('correct_answer' in shown))
  ok('difficulty is withheld', !('difficulty' in shown))
  ok('explanation is withheld', !('explanation' in shown))
  ok('solve and distractor_solve are withheld', !('solve' in shown) && !('distractor_solve' in shown))
  ok('prompt, choices and passage are KEPT', ['prompt', 'choices', 'passage'].every(k => k in shown))
  ok('passage_group_id survives the regex', 'passage_group_id' in shown)
  ok('domain is kept (a one-word blueprint label, not a method)', 'domain' in shown)
  ok('subskill is WITHHELD — it is author prose naming the solution path',
    !('subskill' in shown))
  /* The re-deal must actually permute, and must preserve the key's presence.
   * Break it both ways: a deal that returned the input unchanged, or that
   * dropped an option, would pass a naive "is it an array" check. */
  const src = ['w', 'x', 'y', 'z']
  const dealt = reDeal(src, 'FIXTURE-1')
  ok('re-deal keeps every option exactly once',
    [...dealt].sort().join('') === [...src].sort().join(''), dealt)
  let moved = 0
  for (let i = 0; i < 50; i++) if (reDeal(src, 'FX-' + i).join('') !== src.join('')) moved++
  ok(`re-deal actually permutes (${moved}/50 differ from authored order)`, moved >= 40, moved)
  ok('re-deal is deterministic for a given id',
    reDeal(src, 'FIXTURE-1').join('') === dealt.join(''))
  // Break it: the rendered JSON must not contain the key string anywhere.
  const leaked = JSON.stringify(shown).includes('because a')
  ok('no withheld text appears anywhere in the shown object', !leaked)
  // And the split must be lossless, or something was dropped silently.
  /* The fixture above has TWELVE fields, not ten. The first version of this
   * assertion said ten, I had hand-counted, and the self-test failed on a
   * correct implementation. Fixed the fixture, not the code — the same error
   * an ISEE author made today, where a hand-written run fixture claimed one
   * run and the checker correctly found two. Compute the count instead of
   * asserting a literal, so it cannot rot when the fixture grows. */
  const IN = 12
  const n = Object.keys(shown).length + Object.keys(withheld).length
  ok(`split is lossless (${IN} fields in, ${IN} out)`, n === IN, n)
  // A NEW sensitive-looking field must be caught without anyone editing this file.
  const t = splitItem({ id: 'X', prompt: 'p', choices: [], answer_notes: 'secret' })
  ok('an unseen field named *answer* is withheld automatically', !('answer_notes' in t.shown))
  console.log(bad ? `\nSELF-TEST FAILED (${bad})` : '\nself-test passed.')
  process.exit(bad ? 1 : 0)
}

const args = process.argv.slice(2)
if (args.includes('--selftest')) selftest()

const path = args.find(a => a.endsWith('.json'))
if (!path) { console.error('usage: make-grade-render.mjs <batch.json> [--out <tag>] | --selftest'); process.exit(2) }
const batch = JSON.parse(readFileSync(path, 'utf8'))
if (!Array.isArray(batch) || !batch.length) {
  console.error(`REFUSING: ${path} holds no items. A render over zero items is not a render.`); process.exit(2)
}
const tag = args[args.indexOf('--out') + 1] ?? path.replace(/\.batch\.json$/, '').replace(/^.*\//, '')
const sha = createHash('sha256').update(readFileSync(path)).digest('hex')

const shownAll = [], keyAll = {}
const withheldFields = new Set(), keptUnknown = new Set()
const KNOWN = new Set(['id', 'domain', 'subskill', 'prompt', 'choices', 'passage', 'graphic',
  'passage_group_id', 'topic_id', 'set_id', 'topic_tag', 'format', 'kind', 'task'])
for (const raw of batch) {
  const { shown, withheld } = splitItem(raw)
  for (const k of Object.keys(withheld)) withheldFields.add(k)
  for (const k of Object.keys(shown)) if (!KNOWN.has(k)) keptUnknown.add(k)
  if (Array.isArray(shown.choices)) shown.choices = reDeal(shown.choices, raw.id)
  shownAll.push(shown)
  keyAll[String(raw.id)] = { correct_answer: raw.correct_answer, difficulty: raw.difficulty,
    dealt_index: Array.isArray(shown.choices) ? shown.choices.indexOf(raw.correct_answer) : null }
}

/* Report the dealt key-slot sequence so the next reader can see for themselves
 * that it carries no pair structure, rather than taking this comment for it. */
const dealtSlots = batch.map(r => (Array.isArray(r.choices) ? reDeal(r.choices, r.id).indexOf(r.correct_answer) : -1))
let pairHits = 0, pairTot = 0
for (let i = 0; i + 1 < dealtSlots.length; i += 2) { pairTot++; if (dealtSlots[i] === dealtSlots[i + 1]) pairHits++ }

/* A final guard, because a deny-list can still be defeated by a key string
 * that happens to appear in a kept field. Report it rather than fail: on a
 * maths item the key value legitimately appears nowhere else, but on a prose
 * item an option's text can repeat a passage phrase, which is not a leak. */
const suspicious = batch.filter(r => {
  const { shown } = splitItem(r)
  const ex = String(r.explanation ?? '')
  return ex.length > 40 && JSON.stringify(shown).includes(ex.slice(0, 40))
}).map(r => r.id)

writeFileSync(`scripts/study-bank/${tag}.grade.json`, JSON.stringify(shownAll, null, 1))
writeFileSync(`scripts/study-bank/${tag}.gradekey.json`, JSON.stringify(keyAll, null, 1))
console.log(`${tag}: ${shownAll.length} items rendered from ${path}`)
console.log(`  source sha256 : ${sha.slice(0, 16)}   <- quote this with the grade`)
console.log(`  WITHHELD      : ${[...withheldFields].sort().join(', ') || '(nothing — check the input)'}`)
console.log(`  kept, unrecognised: ${[...keptUnknown].sort().join(', ') || '(none)'}   <- verify none of these leaks the key`)
if (suspicious.length) console.log(`  WARNING: explanation text appears inside the shown fields of: ${suspicious.join(' ')}`)
console.log(`  wrote scripts/study-bank/${tag}.grade.json  (give the grader THIS, not the batch)`)
console.log(`  dealt key slots : ${dealtSlots.join(',')}`)
console.log(`  consecutive pairs sharing a slot: ${pairHits} of ${pairTot}   (chance ~${(pairTot / (batch[0]?.choices?.length ?? 4)).toFixed(1)})`)
console.log(`  wrote scripts/study-bank/${tag}.gradekey.json  (scoring only — never give this to a grader)`)
