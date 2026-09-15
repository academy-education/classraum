#!/usr/bin/env node
/**
 * score-aeng-ws.mjs <batch.json> <grader.json...>
 *
 * Scores a WITH-SOURCE panel for an ACT English batch and applies the
 * acceptance rule. Exists as its own file rather than a copy of an earlier
 * scorer because of a defect recorded on 2026-09-14: score-v16.py was
 * derived from score-v15.py and carried a per-batch JUDGEMENT across the
 * copy, printing a sentence about three items nobody had judged. A
 * per-batch judgement does not survive a copy, so nothing here is
 * batch-specific.
 *
 * DISCIPLINE THIS FILE IS BUILT TO (CLAUDE.md):
 *  - refuses (exit 2) rather than returning a number when it cannot read
 *    its input, and never falls back to a default grader set
 *  - prints every DENOMINATOR before any verdict
 *  - reads four spellings of the pick field. A previous scorer reported
 *    that two graders "skipped all 20 items"; the real cause was that they
 *    wrote `answer` where it read `pick`. It now names the real cause.
 *  - accepts a flat id-keyed map OR one wrapped under `.items`, because a
 *    scorer silently read a wrapper once and mis-scored a whole batch
 */
import { readFileSync } from 'node:fs'

const [batchPath, ...graderPaths] = process.argv.slice(2)
if (!batchPath || graderPaths.length === 0) {
  console.error('usage: score-aeng-ws.mjs <batch.json> <grader.json...>'); process.exit(2)
}
const readJson = p => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) {
  console.error(`REFUSING: cannot read ${p}: ${e.message}`); process.exit(2) } }

const batch = readJson(batchPath)
if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${batchPath} is not a non-empty array`); process.exit(2) }
const LETTERS = ['A', 'B', 'C', 'D', 'E']
const keyOf = {}
for (const it of batch) {
  const i = it.choices.indexOf(it.correct_answer)
  if (i < 0) { console.error(`REFUSING: ${it.id} correct_answer is not among its choices`); process.exit(2) }
  keyOf[it.id] = LETTERS[i]
}
const ids = batch.map(x => x.id)

const PICK_FIELDS = ['pick', 'answer', 'choice', 'letter']
const graders = {}
for (const p of graderPaths) {
  const raw = readJson(p)
  const map = (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.items && typeof raw.items === 'object') ? raw.items : raw
  if (!map || typeof map !== 'object' || Array.isArray(map)) { console.error(`REFUSING: ${p} is not an id-keyed object`); process.exit(2) }
  const name = p.split('/').pop()
  let used = null
  for (const f of PICK_FIELDS) { if (Object.values(map).some(v => v && v[f])) { used = f; break } }
  if (!used) {
    console.error(`REFUSING: ${name} has none of ${PICK_FIELDS.join('/')} on any row — the field name is wrong, the grader did not skip`)
    process.exit(2)
  }
  const unknown = Object.keys(map).filter(k => !keyOf[k])
  graders[name] = { map, used, unknown }
}

console.log(`batch ${batchPath.split('/').pop()}: ${ids.length} items`)
for (const [n, g] of Object.entries(graders)) {
  const answered = ids.filter(i => g.map[i] && g.map[i][g.used]).length
  console.log(`  ${n.padEnd(22)} pick field '${g.used}'  answered ${answered} of ${ids.length}` +
    (g.unknown.length ? `  ** ${g.unknown.length} ids NOT IN BATCH: ${g.unknown.slice(0, 4).join(', ')}` : ''))
  if (!answered) { console.error(`REFUSING: ${n} answered zero of the batch's ids — wrong file or wrong ids`); process.exit(2) }
}

/* Control derived from the data, never a literal: the best single letter a
 * solver could fix on, given how THIS batch's keys are distributed. */
const dist = {}
for (const id of ids) dist[keyOf[id]] = (dist[keyOf[id]] ?? 0) + 1
const bestFixed = Math.max(...Object.values(dist)) / ids.length
console.log(`  key distribution ${LETTERS.map(l => l + ':' + (dist[l] ?? 0)).filter(s => !s.endsWith(':0')).join(' ')}` +
  `  -> best-fixed-letter control ${(bestFixed * 100).toFixed(1)}%`)

const maj = (vals, pred) => vals.filter(pred).length * 2 > vals.length
const rows = []
for (const id of ids) {
  const vs = Object.values(graders).map(g => g.map[id]).filter(Boolean)
  const fieldOf = v => PICK_FIELDS.find(f => v[f])
  const picks = vs.map(v => v[fieldOf(v)]).filter(Boolean)
  const keyVotes = picks.filter(p => String(p).trim().toUpperCase().startsWith(keyOf[id])).length
  const diffs = vs.map(v => (v.difficulty || '').toLowerCase()).filter(Boolean)
  const dq = vs.map(v => (v.distractor_quality || '').toLowerCase()).filter(Boolean)
  const sd = vs.filter(v => v.second_defensible === true).length
  rows.push({ id, keyVotes, n: picks.length, diffs, dq, sd,
    notes: vs.map(v => (v.note || '').trim()).filter(Boolean) })
}
const agreeTotal = rows.reduce((a, r) => a + r.keyVotes, 0)
const pickTotal = rows.reduce((a, r) => a + r.n, 0)
console.log(`\n  panel agreement with the key: ${agreeTotal} of ${pickTotal} picks = ${(100 * agreeTotal / pickTotal).toFixed(1)}%`)

/* ACCEPTANCE. Deliberately the SAME rule the R&W pipeline uses, so a batch
 * cannot be cleared by a bar invented for it: >=2 key votes, majority
 * difficulty hard or medium, majority distractors plausible or strong, and
 * NO grader flagging a second defensible answer. The last is unanimous on
 * purpose — one reader finding a second legal answer is enough to make an
 * item contested, and a majority vote would let two readers outvote the
 * one who actually spotted it. */
const accept = [], drop = []
for (const r of rows) {
  const why = []
  if (r.keyVotes < 2) why.push(`only ${r.keyVotes}/${r.n} agree with the key`)
  if (!maj(r.diffs, d => d === 'hard' || d === 'medium')) why.push(`majority difficulty ${r.diffs.join('/')}`)
  if (!maj(r.dq, q => q === 'plausible' || q === 'strong')) why.push(`distractors ${r.dq.join('/')}`)
  if (r.sd > 0) why.push(`${r.sd} grader(s) flagged a second defensible answer`)
  ;(why.length ? drop : accept).push({ ...r, why })
}
const hist = {}
for (const r of rows) for (const d of r.diffs) hist[d] = (hist[d] ?? 0) + 1
console.log(`  difficulty votes: ${Object.entries(hist).map(([k, v]) => k + ' ' + v).join(', ')}`)
console.log(`\n  ACCEPT ${accept.length}   DROP ${drop.length}`)
for (const d of drop) console.log(`    DROP ${d.id}: ${d.why.join('; ')}`)
const noted = rows.filter(r => r.notes.length)
if (noted.length) {
  console.log(`\n  ${noted.length} item(s) carry grader notes:`)
  for (const r of noted) for (const n of r.notes) console.log(`    ${r.id}: ${n.slice(0, 160)}`)
}
console.log(`\nKEEP_IDS=${accept.map(a => a.id).join(',')}`)
