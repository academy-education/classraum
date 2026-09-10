#!/usr/bin/env node
/**
 * math-qc-aggregate.mjs — fold three independent with-source grades into the
 * qc.json that math-bank-helper.mjs reads at insert.
 *
 *   TAG=act-math-v2-alg BATCH=scripts/study-bank/act-math-v2-alg.batch.json \
 *     node scripts/study-bank/math-qc-aggregate.mjs
 *
 *   ROUTED=1   also drop majority-easy items (SAT module-2 hard route)
 *   REGRADE=id,id   these ids are judged ONLY by <TAG>.regrade-{a,b,c}.json
 *
 * WHY A SCRIPT. This was done inline three times in one session and the third
 * attempt refused to score 24 items as "absent" — two graders had nested their
 * output under an `items` key while the first put ids at the top level. The
 * refusal was correct and is the whole point, but a rule this easy to trip
 * belongs somewhere it can be fixed once.
 *
 * WHY IT REFUSES RATHER THAN DEFAULTS. sec-qc-aggregate.mjs gated on
 * `v.passage_needed !== false` against solver files that never wrote the
 * field, and `undefined !== false` is true, so every item cleared a check with
 * no input. Missing fields exit 2 here, naming the item and the grader.
 *
 * ROUTED is not cosmetic. SAT module 2 draws a hard route, so a majority-easy
 * item is a wasted slot in the band that binds. ACT Math is NOT
 * difficulty-routed — a form is drawn to domain quotas at mixed difficulty —
 * so `easy` there is a wanted grade and dropping it would thin the very
 * domain the batch was authored to relieve.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const TAG = process.env.TAG
const BATCH = process.env.BATCH
if (!TAG || !BATCH) { console.error('TAG and BATCH are required.'); process.exit(2) }
const ROUTED = process.env.ROUTED === '1'
const REGRADE = new Set((process.env.REGRADE ?? '').split(',').filter(Boolean))

const items = JSON.parse(readFileSync(BATCH, 'utf8'))
if (!Array.isArray(items) || !items.length) {
  console.error(`REFUSING: ${BATCH} holds no items. A grade over zero items is not a grade.`)
  process.exit(2)
}

/** Graders write ids at the top level or nested under `items`. Accept both,
 *  and fail loudly if neither yields the ids this batch actually contains. */
function loadGrades(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const ids = new Set(items.map(i => i.id))
  const atTop = Object.keys(raw).filter(k => ids.has(k))
  if (atTop.length) return raw
  for (const v of Object.values(raw)) {
    if (v && typeof v === 'object' && Object.keys(v).some(k => ids.has(k))) return v
  }
  console.error(`REFUSING: ${path} contains none of this batch's item ids at the top level or under any nested key.`)
  process.exit(2)
}

const set = kind => ['a', 'b', 'c'].map(s => loadGrades(`scripts/study-bank/${TAG}.${kind}-${s}.json`))
const grades = set('grader')
const regrades = REGRADE.size ? set('regrade') : null

const REQUIRED = ['difficulty', 'exclusive', 'distractor_quality']
const missing = []
for (const it of items) {
  const src = REGRADE.has(it.id) ? regrades : grades
  for (const [i, g] of src.entries()) {
    const v = g[it.id]
    if (!v) { missing.push(`${it.id}: grader ${'abc'[i]} has no entry`); continue }
    for (const f of REQUIRED) if (!(f in v)) missing.push(`${it.id}: grader ${'abc'[i]} missing '${f}'`)
  }
}
if (missing.length) {
  console.error(`REFUSING TO SCORE: ${missing.length} missing field(s). A gate with no input is not a pass.`)
  for (const m of missing.slice(0, 20)) console.error('  ' + m)
  if (missing.length > 20) console.error(`  ... and ${missing.length - 20} more`)
  process.exit(2)
}

/**
 * MEDIAN on the ordinal scale, not the mode.
 *
 * Both grades are ORDERED — easy < medium < hard, weak < plausible < strong —
 * and the mode is undefined when three graders disagree three ways. The first
 * version of this script used the mode and, on AM2A-11
 * (weak / strong / plausible), reported "majority weak distractors (1/3)" and
 * DROPPED the item. There was no majority; the tiebreak was object insertion
 * order. One vote in three decided it, in the flattering-to-the-checker
 * direction, and the printed reason contradicted its own vote count — which
 * is the tell that caught it.
 *
 * The median of three ordered values is the middle one, always exists, never
 * ties, and agrees with the mode on every non-tied case (verified across both
 * batches: only AM2A-11 moves, weak -> plausible).
 */
const ORDER = { easy: 0, medium: 1, hard: 2, weak: 0, plausible: 1, strong: 2 }
const maj = a => {
  const known = a.filter(v => v in ORDER)
  if (known.length !== a.length) {
    console.error(`REFUSING: unrecognised grade in ${JSON.stringify(a)}`)
    process.exit(2)
  }
  return [...known].sort((x, y) => ORDER[x] - ORDER[y])[Math.floor(known.length / 2)]
}

const qc = {}, reasons = {}
let kept = 0
for (const it of items) {
  const src = REGRADE.has(it.id) ? regrades : grades
  const v = src.map(g => g[it.id])
  const difficulty = maj(v.map(x => x.difficulty))
  const distractor_quality = maj(v.map(x => x.distractor_quality))
  const weakVotes = v.filter(x => x.distractor_quality === 'weak').length
  const nonExcl = v.filter(x => x.exclusive === false).length
  const why = []
  // One vote is enough. An item a careful reader can defend a second answer
  // to is not a multiple-choice item, and the cost of a false drop is one
  // item while the cost of a false keep is a student marked wrong for being
  // right.
  if (nonExcl >= 1) why.push(`non-exclusive (${nonExcl}/3)`)
  if (distractor_quality === 'weak') why.push(`majority weak distractors (${weakVotes}/3)`)
  if (ROUTED && difficulty === 'easy') why.push('majority easy (hard-routed section)')
  const ok = why.length === 0
  if (ok) { kept++; qc[it.id] = { difficulty, distractor_quality } }
  reasons[it.id] = { ok, difficulty, distractor_quality, weakVotes, nonExclusiveVotes: nonExcl,
    grades: v.map(x => x.difficulty).join('/'),
    distractorVotes: v.map(x => x.distractor_quality).join('/'),
    regraded: REGRADE.has(it.id), why }
}

writeFileSync(`scripts/study-bank/${TAG}.qc.json`, JSON.stringify(qc, null, 1))
writeFileSync(`scripts/study-bank/${TAG}.qc-reasons.json`, JSON.stringify(reasons, null, 1))

console.log(`${kept}/${items.length} survive the with-source grade${ROUTED ? '  (hard-routed: easy dropped)' : ''}`)
for (const [id, r] of Object.entries(reasons)) if (!r.ok) console.log(`  drop ${id} [${r.grades}] - ${r.why.join('; ')}`)
const d = {}
for (const r of Object.values(reasons)) if (r.ok) d[r.difficulty] = (d[r.difficulty] ?? 0) + 1
console.log('survivors by banked difficulty:', JSON.stringify(d))
const w = {}
for (const r of Object.values(reasons)) w[r.weakVotes] = (w[r.weakVotes] ?? 0) + 1
console.log('items by number of graders calling distractors weak:', JSON.stringify(w))
