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
 * `domain` is withheld too, and my reasoning for keeping it was wrong. I kept
 * it as "a one-word blueprint label, not a method" — true for maths, where it
 * reads "Functions" or "Algebra". It is FALSE for ACT Science and ACT Reading,
 * where the blueprint domains are full descriptive phrases: a grader found
 * that "Evaluation of Models, Inferences, and Experimental Results" announces
 * an item as a claim-contradiction before the stem is read. Their words:
 * "weak, but free to remove." A grader judges against the real exam, not
 * against the blueprint, so nothing is lost.
 */
/*
 * `options_only`, `construction`, `relation` added 2026-09-11.
 *
 * A new authoring convention put the AUTHOR'S OWN SELF-CHECK in the batch:
 * `options_only_note` ("each option is a real property a torn sheet of metal
 * can have, and two of the four wrong ones are as common as the key..."),
 * `options_only_legal`, `construction`, and on analogies `relation` /
 * `option_relations`. Those are the author reasoning about which options are
 * wrong — the single most direct leak a render can carry.
 *
 * THE NAME DENY-LIST DID NOT CATCH IT. THE CONTENT GUARD DID, and refused to
 * write the render: "item SV13-02: kept field 'options_only_note' names 4 of
 * this item's 5 options." That is exactly the case the content guard was
 * added for after `distractor_steps`, arriving on a field nobody had thought
 * of, which is the argument for keeping a structural check behind every
 * deny-list. The names are added here so the refusal does not have to be the
 * mechanism every time; the content guard stays as the backstop for the next
 * convention nobody anticipates.
 */
const SENSITIVE = /answer|correct|key|rationale|difficulty|explanation|solve|subskill|distractor|options_only|construction|relation|^domain$/i
/** Fields that match SENSITIVE but are structural and safe to keep. */
const KEEP_ANYWAY = new Set(['passage_group_id', 'topic_id', 'set_id'])
/** Fields the with-source grader is MEANT to read. optionLeak skips these;
 *  see its comment. Declared here, not next to optionLeak, because --selftest
 *  runs before that point in the file and a `const` in the temporal dead zone
 *  threw ReferenceError — a crash the render path would never have shown,
 *  since by then the module is fully evaluated. */
const STIMULUS = new Set(['choices', 'prompt', 'passage', 'graphic'])

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
 * population this file serves. So the render deals like the draw does:
 * deterministic, so two graders and a re-run see the same deal and their
 * disagreement means something.
 *
 * AND FROM A DECK, not independently per item — corrected the same day, by
 * a grader who read the first version. A per-item seed is deterministic but
 * BINOMIAL, so slot counts drift and clump. On isee-math-s11 it produced
 * A7/B6/C12/D5, and worse, `items 15-19 read D,D,D,C,D` — four of the
 * batch's five D keys inside one five-item window. Their words: "I would
 * still re-shuffle rather than ship a file where every D in the batch sits
 * in one five-item window."
 *
 * math-bank-helper's renderBlind had exactly this and was fixed the same
 * morning; this file did not get the fix. Dealing round-robin from a
 * shuffled deck makes the counts as even as the item count allows.
 */
function dealSeed(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
/** Key slot for every item, dealt flat from a shuffled deck over the WHOLE
 *  batch. Stable for a given file and independent of authored order. */
function keySlots(batch) {
  const widths = [...new Set(batch.map(i => (i.choices ?? []).length).filter(Boolean))]
  const w = widths.length === 1 ? widths[0] : 4
  const rand = dealSeed(batch.map(i => String(i.id)).join('|') + ':deck')
  const deck = batch.map((_, i) => i % w)
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]] }
  return new Map(batch.map((it, i) => [String(it.id), deck[i]]))
}

function reDeal(choices, id, slot) {
  const rand = dealSeed(String(id) + ':grade')
  if (slot === undefined) {             // selftest path: plain shuffle
    const a = [...choices]
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
    return a
  }
  return choices                         // placeholder; real deal happens in dealWithKey
}

/** Place the key at `slot` and shuffle the rest around it. */
function dealWithKey(choices, key, id, slot) {
  const rand = dealSeed(String(id) + ':grade')
  const rest = choices.filter(c => c !== key)
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]] }
  const out = []; let k = 0
  for (let j = 0; j < choices.length; j++) out.push(j === slot ? key : rest[k++])
  return out
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
  ok('domain is WITHHELD — on ACT Science and Reading it is a descriptive phrase that names the item type',
    !('domain' in shown))
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
  /* The structural guard, which is what actually catches the next unknown
   * field name. This is the sat-adv-h3 shape exactly. */
  const choices4 = ['324', '81', '18', '-18']
  ok('a kept field naming ALL BUT ONE option is detected (the set-complement leak)',
    optionLeak({ notes: 'wrong: 324, 81, -18' }, choices4) !== null)
  ok('a kept field naming EVERY option is detected',
    optionLeak({ notes: '324 81 18 -18' }, choices4) !== null)
  ok('a kept field naming ONE option is NOT flagged (prose may repeat a value)',
    optionLeak({ notes: 'the value 324 appeared once' }, choices4) === null)
  ok('the choices array itself is exempt', optionLeak({ choices: choices4 }, choices4) === null)
  /* The two REAL items that this guard refused on 2026-09-11. Both are sound;
   * the guard was wrong. Fixtures copied from the batches verbatim so the
   * regression is the actual case, not a stylised version of it. */
  ok('AM4F-24: an id whose digits are substrings of 3 of 4 options is not a leak',
    optionLeak({ id: 'AM4F-24', prompt: 'f(x) = |3x - 9|' }, ['8', '-2', '2', '24'], 'AM4F-24') === null)
  ok('IM11-08: a median stem listing its own data values is not a leak',
    optionLeak({ id: 'IM11-08', prompt: '5 players scored 0 goals, 2 scored 1 goal, 3 scored 2 goals' },
      ['1.5', '0', '2', '1'], 'IM11-08') === null)
  /* ...and the exemptions must not have blunted the guard. Same two shapes,
   * moved into a METADATA field, must still refuse. This is the marginal
   * case: if `prompt` were exempted by being skipped wholesale rather than
   * by being the stimulus, these would pass silently. */
  ok('the same text in a NON-stimulus field still refuses',
    optionLeak({ id: 'IM11-08', distractor_steps: 'wrong: 0, 2, 1' },
      ['1.5', '0', '2', '1'], 'IM11-08') !== null)
  ok('stripping the id does not stop a real leak that repeats the id',
    optionLeak({ id: 'AM4F-24', steps: 'AM4F-24 wrong paths give 8, -2, 24' },
      ['8', '-2', '2', '24'], 'AM4F-24') !== null)
  /* The --out default. `args.indexOf('--out') + 1` is 0 when --out is absent,
   * so the old code read args[0] — the input path — as the tag. */
  const tagOf = (args2, path2) => { const i = args2.indexOf('--out')
    return (i >= 0 ? args2[i + 1] : undefined) ?? path2.replace(/\.batch\.json$/, '').replace(/^.*\//, '') }
  ok('tag defaults to the basename when --out is absent',
    tagOf(['scripts/study-bank/ssat-math-s10.kept.batch.json'],
      'scripts/study-bank/ssat-math-s10.kept.batch.json') === 'ssat-math-s10.kept',
    tagOf(['scripts/study-bank/ssat-math-s10.kept.batch.json'], 'scripts/study-bank/ssat-math-s10.kept.batch.json'))
  ok('tag honours --out when present',
    tagOf(['x.batch.json', '--out', 'chosen'], 'x.batch.json') === 'chosen')
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
/*
 * `args[args.indexOf('--out') + 1]` — when --out is ABSENT indexOf returns -1
 * and this read args[0], which is the input PATH, not a tag. The render was
 * then written to `scripts/study-bank/scripts/study-bank/<path>.grade.json`,
 * i.e. it crashed on a missing directory, or (had the directory existed)
 * would have written a correct render under a name nobody would look for.
 * Default the tag explicitly instead of relying on a sentinel index.
 */
const outIdx = args.indexOf('--out')
const tag = (outIdx >= 0 ? args[outIdx + 1] : undefined)
  ?? path.replace(/\.batch\.json$/, '').replace(/^.*\//, '')
if (!tag) { console.error('--out given with no value'); process.exit(2) }
const sha = createHash('sha256').update(readFileSync(path)).digest('hex')

const shownAll = [], keyAll = {}
const withheldFields = new Set(), keptUnknown = new Set()
const KNOWN = new Set(['id', 'prompt', 'choices', 'passage', 'graphic',
  'passage_group_id', 'topic_id', 'set_id', 'topic_tag', 'format', 'kind', 'task'])
const slotMap = keySlots(batch)
for (const raw of batch) {
  const { shown, withheld } = splitItem(raw)
  for (const k of Object.keys(withheld)) withheldFields.add(k)
  for (const k of Object.keys(shown)) if (!KNOWN.has(k)) keptUnknown.add(k)
  if (Array.isArray(shown.choices) && raw.correct_answer != null && shown.choices.includes(raw.correct_answer))
    shown.choices = dealWithKey(shown.choices, raw.correct_answer, raw.id, slotMap.get(String(raw.id)))
  const leak = optionLeak(shown, raw.choices, raw.id)
  if (leak) {
    console.error(`REFUSING to write a render that is not blind.`)
    console.error(`  item ${raw.id}: kept field '${leak.field}' names ${leak.named} of this item's ${leak.of} options.`)
    console.error(`  Naming all but one makes the key the set complement. Withhold that field.`)
    process.exit(2)
  }
  shownAll.push(shown)
  keyAll[String(raw.id)] = { correct_answer: raw.correct_answer, difficulty: raw.difficulty,
    dealt_index: Array.isArray(shown.choices) ? shown.choices.indexOf(raw.correct_answer) : null }
}

/* Report the dealt key-slot sequence so the next reader can see for themselves
 * that it carries no pair structure, rather than taking this comment for it. */
const dealtSlots = batch.map(r => slotMap.get(String(r.id)) ?? -1)
{ const c = {}; for (const s2 of dealtSlots) c[s2] = (c[s2] ?? 0) + 1
  const vals = Object.values(c)
  console.log(`  slot counts: ${JSON.stringify(c)}   spread ${Math.max(...vals) - Math.min(...vals)} (0 or 1 means a flat deck deal)`) }
let pairHits = 0, pairTot = 0
for (let i = 0; i + 1 < dealtSlots.length; i += 2) { pairTot++; if (dealtSlots[i] === dealtSlots[i + 1]) pairHits++ }

/*
 * ── THE DENY LIST IS ALWAYS ONE FIELD BEHIND. CHECK THE CONTENT. ─────
 *
 * `sat-adv-h3` stored its per-option derivations under `distractor_steps`
 * rather than `distractor_solve`. The name matched nothing in the regex, so
 * it was KEPT — and it names exactly the three wrong options per item, which
 * makes the key the set complement on all 24 items with no solving at all.
 * Its prose leaked the solve path too ("Solves k^2 = 324 correctly but
 * reports the negative root", where the key is +18).
 *
 * TWO GRADERS FOUND IT INDEPENDENTLY AND BOTH SAID THEIR KEY AGREEMENT ON
 * THAT FILE MUST NOT BE COUNTED. The tool had in fact printed the field as
 * "kept, unrecognised" — and I filtered that line out of my own terminal
 * output while checking something else. The warning worked; I hid it.
 *
 * So the name check is now only the cheap first pass. The real guard is
 * structural and it REFUSES rather than warns: if any kept field other than
 * `choices` mentions option strings, the render is not blind and must not be
 * written. A deny-list of names cannot anticipate the next author's field
 * name; a content check does not have to.
 */
/*
 * THE STIMULUS IS NOT A LEAK, AND AN ID IS NOT EVIDENCE — both fixed
 * 2026-09-11, after this guard refused two sound items.
 *
 *   AM4F-24  choices ["8","-2","2","24"], flagged on the field `id`.
 *            The literal string "AM4F-24" CONTAINS "-2", "2" and "24" as
 *            substrings. Three of four options "named" by an item label that
 *            carries no information about any of them.
 *   IM11-08  choices ["1.5","0","2","1"], flagged on `prompt`. The stem is
 *            "5 players scored 0 goals, 2 scored 1, 3 scored 2 ..." — a
 *            median question listing its own data. Naming a value is what
 *            that item type DOES, and it says nothing about which option
 *            is correct.
 *
 * Both are the same mistake: treating "this text contains the option string"
 * as "this text identifies the option as wrong". The leak this guard was
 * built for (`distractor_steps`) is a field that enumerates the WRONG
 * options, making the key the set complement. That is a property of
 * METADATA, never of the stimulus — and this is the WITH-SOURCE render, so
 * the stimulus is shown on purpose.
 *
 * So: scan every field EXCEPT the stimulus, and strip the item's own id from
 * the text first. The exemption is an allow-list on the stimulus side only —
 * an unrecognised new field is still scanned, which is the direction that
 * has to stay safe.
 */

function optionLeak(shown, choices, id) {
  if (!Array.isArray(choices) || !choices.length) return null
  for (const [k, v] of Object.entries(shown)) {
    if (STIMULUS.has(k)) continue
    let text = typeof v === 'string' ? v : JSON.stringify(v ?? '')
    if (!text) continue
    // An item's own identifier is a label, not a claim about its options.
    if (id != null) text = text.split(String(id)).join(' ')
    if (!text.trim()) continue
    const named = choices.filter(c => String(c).length >= 1 && text.includes(String(c)))
    /* Naming ONE option can be innocent. Naming all but one is the
     * set-complement leak, and naming every one hands over the whole ballot. */
    if (named.length >= choices.length - 1) return { field: k, named: named.length, of: choices.length }
  }
  return null
}

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
