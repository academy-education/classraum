#!/usr/bin/env node
/**
 * make-oo-render.mjs <batch.json> [--tag NAME]
 *
 * Build the OPTIONS-ONLY attack render for a batch: every item reduced to its
 * option strings, with the stem, any passage, any figure and every authored
 * field removed. This is the gate stage that decides a batch (CLAUDE.md: "the
 * attack is the gate, the structural checks are pre-flight").
 *
 * Written as a committed script because every prior version of this lived in a
 * session scratchpad and was rebuilt by hand each time -- which is how a blind
 * file once got rebuilt IN PLACE while a solver was reading it, and how a
 * render once shipped carrying `distractor_steps` and leaked 24 keys.
 *
 * THREE THINGS IT DOES THAT A HAND-ROLLED VERSION KEEPS FORGETTING:
 *
 * 1. KEYS DEALT FLAT. The key is moved to a slot chosen round-robin, so the
 *    best fixed-letter score equals chance. A free shuffle once produced a
 *    56.3% control, at which a solver's score means nothing. The realised
 *    control is COMPUTED from the deal and printed -- never assumed.
 * 2. WIDTH IS READ, NOT ASSUMED. A five-choice batch scored against a 25.0%
 *    literal is five free points, always flattering. Mixed widths are refused
 *    outright: one control cannot describe two populations.
 * 3. NOTHING BUT OPTIONS CROSSES. Only the option strings are emitted. The
 *    blind file carries no id that maps back to the batch -- ids are renumbered
 *    L01.. so a solver cannot look the item up, and the mapping lives only in
 *    the key file.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const args = process.argv.slice(2)
const path = args.find(a => !a.startsWith('--'))
if (!path) { console.error('usage: make-oo-render.mjs <batch.json> [--tag NAME]'); process.exit(2) }
if (!existsSync(path)) { console.error(`REFUSING: ${path} does not exist.`); process.exit(2) }
const ti = args.indexOf('--tag')
const tag = (ti >= 0 ? args[ti + 1] : undefined) ?? path.replace(/^.*\//, '').replace(/\.batch\.json$/, '')

const batch = JSON.parse(readFileSync(path, 'utf8'))
if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${path} holds no items.`); process.exit(2) }

const widths = [...new Set(batch.map(it => (it.choices ?? []).length))]
if (widths.length !== 1) { console.error(`REFUSING: mixed option widths ${widths.join('/')} — one control cannot describe two populations.`); process.exit(2) }
const W = widths[0]
if (W < 2 || W > 8) { console.error(`REFUSING: option width ${W} is not a real item.`); process.exit(2) }
const SLOT = ['A','B','C','D','E','F','G','H'].slice(0, W)

/* The shared generator, not a local one. This script carried its own LCG
 * (seed*1664525+1013904223). The key deal here is round-robin so a biased
 * generator could not skew the CONTROL, which is why it survived the A44
 * sweep — but the distractor order came off it, and "every render imports one
 * shuffle" is the rule precisely so nobody has to re-derive which uses are
 * safe. */
const rand = rng(20260912)
const shuffle = a => shuffleWith(a.slice(), rand)

const blind = {}, key = {}
batch.forEach((it, i) => {
  const ch = (it.choices ?? []).map(String)
  const ci = ch.findIndex(c => c === String(it.correct_answer))
  if (ci < 0) { console.error(`REFUSING: ${it.id} — correct_answer is not among its choices.`); process.exit(2) }
  const want = SLOT[i % W]                      // round-robin => flat deal
  const rest = shuffle(ch.filter((_, j) => j !== ci))
  let r = 0
  const out = SLOT.map(sl => (sl === want ? ch[ci] : rest[r++]))
  const bid = `L${String(i + 1).padStart(2, '0')}`
  blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
  key[bid] = { letter: want, localId: it.id, domain: it.domain ?? null, difficulty: it.difficulty ?? null }
})

/* THE MATCHED LIVE CONTROL, IN THE SAME FILE.
 * `--control N` appends N shipped items of the same section and domain, drawn
 * through this identical render, interleaved so nothing marks the arm. Without
 * it a candidate's rate is compared to a letter-frequency line and nothing
 * else, which cannot tell "this batch leaks" from "models are good at this".
 * Two exclusions, both load-bearing and both printed:
 *   - option WIDTH must match, or one control describes two populations
 *   - cohorts named by --exclude are dropped, so a control is never made of
 *     items inserted by the same session that is being graded
 * The control is drawn from the WHOLE live population and then sampled with
 * the shared generator; the realised deal is computed, never assumed. */
const ci2 = args.indexOf('--control')
const wantCtl = ci2 >= 0 ? Number(args[ci2 + 1]) : 0
/* --control-difficulty <band>: match the control on the BAND as well as the
 * domain. Live SEC is 89 easy / 193 medium / 27 hard; a hard-band candidate
 * scored against that whole pool is compared with an easier regime than its
 * own. Composition-matching is the standing rule — this makes it a flag
 * instead of a hand-rolled draw. */
/* --control-subskill <label>: match on the subskill too. Craft and Structure
 * mixes Words in Context (measured clean, 12.5-33% blind) with Text Structure
 * (87.5%) and Cross-Text (75%); a WIC candidate scored against the whole domain
 * inherits those families' leak as its "control". */
const csi = args.indexOf('--control-subskill')
const ctlSubskill = csi >= 0 ? String(args[csi + 1]) : null
const cdi = args.indexOf('--control-difficulty')
const ctlDifficulty = cdi >= 0 ? String(args[cdi + 1]) : null
if (wantCtl) {
  const xi = args.indexOf('--exclude')
  const exclude = new Set((xi >= 0 ? String(args[xi + 1]) : '').split(',').filter(Boolean))
  const { createClient } = await import('@supabase/supabase-js')
  const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const fam = batch[0].family ?? 'sat'
  /* SAT batch files carry domain but not section; infer it from the domain
   * for both SAT sections rather than only maths, or every R&W batch refuses. */
  const sec = batch[0].section ?? (batch[0].domain && /Algebra|Advanced Math|Geometry|Problem-Solving/.test(batch[0].domain) ? 'math'
    : batch[0].domain && /Standard English Conventions|Craft and Structure|Information and Ideas|Expression of Ideas/.test(batch[0].domain) ? 'reading_writing' : null)
  const dom = batch[0].domain
  if (!sec || !dom) { console.error('REFUSING: --control needs a section and domain on the batch items.'); process.exit(2) }
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('study_item_bank').select('id,cohort,difficulty,subskill,item')
      .eq('family', fam).eq('section', sec).eq('domain', dom)
      .eq('verified', true).eq('archived', false).order('id', { ascending: true }).range(f, f + 999)
    if (error) throw new Error(error.message)
    rows.push(...data); if (data.length < 1000) break
  }
  if (new Set(rows.map(r => r.id)).size !== rows.length) { console.error('REFUSING: paging slipped.'); process.exit(2) }
  let dropWidth = 0, dropCohort = 0, dropBand = 0, dropSub = 0
  const pool = rows.filter(r => {
    const ch = r.item?.choices
    if (!Array.isArray(ch) || ch.length !== W) { dropWidth++; return false }
    if (!ch.map(String).includes(String(r.item?.correct_answer ?? ''))) { dropWidth++; return false }
    if (exclude.has(r.cohort)) { dropCohort++; return false }
    if (ctlDifficulty && String(r.difficulty ?? r.item?.difficulty ?? '') !== ctlDifficulty) { dropBand++; return false }
    if (ctlSubskill && String(r.subskill ?? r.item?.subskill ?? '').toLowerCase() !== ctlSubskill.toLowerCase()) { dropSub++; return false }
    return true
  })
  console.log(`  control pool: ${rows.length} live ${dom} — ${dropWidth} wrong width/no key, ${dropCohort} excluded cohort(s)${ctlDifficulty ? `, ${dropBand} not '${ctlDifficulty}'` : ''}${ctlSubskill ? `, ${dropSub} not '${ctlSubskill}'` : ''} => ${pool.length} eligible`)
  if (pool.length < wantCtl) { console.error(`REFUSING: asked for ${wantCtl} control items, ${pool.length} eligible.`); process.exit(2) }
  const picked = shuffle(pool).slice(0, wantCtl)
  picked.forEach((r, i) => {
    const ch = r.item.choices.map(String)
    const cidx = ch.findIndex(c => c === String(r.item.correct_answer))
    const want = SLOT[(batch.length + i) % W]
    const rest = shuffle(ch.filter((_, j) => j !== cidx))
    let k = 0
    const out = SLOT.map(sl => (sl === want ? ch[cidx] : rest[k++]))
    const bid = `L${String(batch.length + i + 1).padStart(2, '0')}`
    blind[bid] = { options: Object.fromEntries(SLOT.map((sl, j) => [sl, out[j]])) }
    key[bid] = { letter: want, localId: r.id, domain: dom, difficulty: r.item?.difficulty ?? null, kind: 'live-control' }
  })
  for (const k of Object.keys(key)) if (!key[k].kind) key[k].kind = 'candidate'
  // Interleave so the arm is not readable from position.
  const ids = shuffle(Object.keys(blind))
  const b2 = {}, k2 = {}
  ids.forEach((old, i) => { const nid = `L${String(i + 1).padStart(2, '0')}`; b2[nid] = blind[old]; k2[nid] = key[old] })
  for (const k of Object.keys(blind)) { delete blind[k]; delete key[k] }
  Object.assign(blind, b2); Object.assign(key, k2)
}

const dealt = {}; for (const k of Object.values(key)) dealt[k.letter] = (dealt[k.letter] ?? 0) + 1
/* DENOMINATOR, not batch.length. When --control appends items the file grows
 * and `batch.length` stops describing it: a 14+14 file computed 7/14 = 50.0%
 * and printed "score against 50.0%", a control nearly double the truth and
 * flattering in the only direction that matters. Caught by reading it against
 * the per-arm lines, which said 28.6% each. */
const nFile = Object.keys(key).length
const realised = 100 * Math.max(...Object.values(dealt)) / nFile
const chance = 100 / W

const bf = `scripts/study-bank/${tag}-oo.blind.json`
const kf = `scripts/study-bank/${tag}-oo.key.json`
writeFileSync(bf, JSON.stringify(blind, null, 1) + '\n')
writeFileSync(kf, JSON.stringify(key, null, 1) + '\n')

console.log(`${tag}: ${Object.keys(key).length} items in the file (${batch.length} candidate${wantCtl ? ` + ${wantCtl} live control` : ''}), ${W}-choice`)
console.log(`  keys dealt ${JSON.stringify(dealt)}`)
if (wantCtl) for (const arm of ['candidate', 'live-control']) {
  const d = {}; let n = 0
  for (const k of Object.values(key)) if (k.kind === arm) { d[k.letter] = (d[k.letter] ?? 0) + 1; n++ }
  console.log(`  ${arm.padEnd(13)} n=${n} deal ${JSON.stringify(d)} -> best-fixed-letter ${(100 * Math.max(...Object.values(d)) / n).toFixed(1)}%`)
}
console.log(`  chance ${chance.toFixed(1)}%   best-fixed-letter (the REAL control) ${realised.toFixed(1)}%`)
if (realised - chance > 2) console.log(`  NOTE: deal is uneven — score against ${realised.toFixed(1)}%, not ${chance.toFixed(1)}%.`)
console.log(`  blind sha ${createHash('sha256').update(readFileSync(bf)).digest('hex').slice(0,16)}`)
console.log(`  wrote ${bf}`)
console.log(`  wrote ${kf}`)
