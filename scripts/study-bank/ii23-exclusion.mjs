#!/usr/bin/env node
/**
 * ii23-exclusion.mjs <items.json|batch.json> [more.json ...] [--offline]
 *
 * The duplicate-exclusion check of PREREG-II23-2026-10-23.md ("Exclusion"). A port of sec25-exclusion.mjs
 * (SEC v22 Amendment 2's hold rule) to Information and Ideas, against TWO reference populations:
 *
 *   LIVE   every live SAT R&W Information and Ideas row (verified, not archived), paged past PostgREST's
 *          1000-row cap, ordered by id, count-asserted (read-only);
 *   PRIOR  every II21 and II22 CANDIDATE, kept, held or dropped: the two frozen batches
 *          (sat-ii-hard-v2{1,2}.batch.json, 24 items each, refused otherwise) plus the authors' pre-freeze files
 *          (sat-ii-v2{1,2}-work/{A,B,C,D}/items.json, 6 each, refused otherwise), so an item replaced before a
 *          freeze is excluded too.
 *
 * A candidate is FLAGGED (changed before delivery; HELD if still flagged at freeze) when, against any reference
 * row:
 *   - its passage word-trigram Jaccard is >= 0.20, or
 *   - its option set is IDENTICAL as strings (case, whitespace, curly quotes, dash variants normalised; order
 *     ignored), or 3+ of its options appear verbatim in one reference item (rw17-dupscan's option rule), or
 *   - its table's cell matrix is identical to a reference table's (quantitative items).
 * Within the candidate files the same rules are applied pairwise.
 *
 * EXIT
 *   2  refused: no candidate file, a missing/unreadable/empty file, an item without a passage or without 4 string
 *      choices, duplicate candidate ids, a prior frozen batch missing or not 24 items, a prior author file missing
 *      or not 6 items, no Supabase env (without --offline), a paged read whose length disagrees with the exact
 *      count, zero live rows, a live row with neither passage nor prompt, an unknown flag.
 *   1  computed, and something is flagged; or --offline (LIVE NOT MEASURED cannot pass).
 *   0  computed against both populations, nothing flagged.
 *
 * Self-test (PREREG-II23 Scripts): sat-ii-hard-v22.batch.json must flag 24/24 against PRIOR at Jaccard 1.000
 * with identical option sets, and find its 21 inserted items in LIVE at 1.000.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const args = process.argv.slice(2)
const offline = args.includes('--offline')
for (const a of args) if (a.startsWith('--') && a !== '--offline') die(`unknown flag ${a}`)
const files = args.filter(a => !a.startsWith('--'))
if (!files.length) { console.error('usage: ii23-exclusion.mjs <items.json|batch.json> [more.json ...] [--offline]'); process.exit(2) }
const D = dirname(fileURLToPath(import.meta.url))
const ROOT = join(D, '..', '..')
const readArr = (f, what) => {
  if (!existsSync(f)) die(`${what} ${f} is missing`)
  let j; try { j = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { die(`${what} ${f}: ${e.message}`) }
  if (!Array.isArray(j) || !j.length) die(`${what} ${f} holds no items`)
  return j
}
const checkItem = (it, f) => {
  if (!it || typeof it.id !== 'string') die(`${f}: an item has no string id`)
  if (typeof it.passage !== 'string' || !it.passage.trim()) die(`${f}: ${it.id} has no passage`)
  if (!Array.isArray(it.choices) || it.choices.length !== 4 || it.choices.some(c => typeof c !== 'string')) die(`${f}: ${it.id} needs exactly 4 string choices`)
}
const cellsOf = g => (g && Array.isArray(g.cells)) ? JSON.stringify(g.cells.map(r => (r ?? []).map(c => String(c).replace(/\s+/g, '')))) : null

/* candidates */
const C = []
for (const f of files) for (const it of readArr(f, 'candidate file')) { checkItem(it, f); C.push({ ...it, _file: f }) }
const cids = C.map(c => c.id)
if (new Set(cids).size !== cids.length) die('duplicate candidate ids across the files given')

/* prior candidates */
const PRIOR = []
for (const v of [21, 22]) {
  const fb = join(D, `sat-ii-hard-v${v}.batch.json`)
  const b = readArr(fb, 'frozen prior batch')
  if (b.length !== 24) die(`${fb} holds ${b.length} items, not 24: the prior population would be incomplete`)
  for (const it of b) { checkItem(it, fb); PRIOR.push({ id: it.id, src: `v${v} frozen`, passage: it.passage, choices: it.choices, cells: cellsOf(it.graphic) }) }
  for (const a of ['A', 'B', 'C', 'D']) {
    const fw = join(D, `sat-ii-v${v}-work`, a, 'items.json')
    const w = readArr(fw, 'prior author file')
    if (w.length !== 6) die(`${fw} holds ${w.length} items, not 6`)
    for (const it of w) { checkItem(it, fw); PRIOR.push({ id: it.id, src: `v${v} pre-freeze ${a}`, passage: it.passage, choices: it.choices, cells: cellsOf(it.graphic) }) }
  }
}

/* live */
let LIVE = null
if (!offline) {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const envf = join(ROOT, '.env.local')
  if ((!url || !key) && existsSync(envf)) {
    const env = Object.fromEntries(readFileSync(envf, 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
    url ??= env.NEXT_PUBLIC_SUPABASE_URL; key ??= env.SUPABASE_SERVICE_ROLE_KEY
  }
  if (!url || !key) die('Supabase env not found (.env.local or the environment), or pass --offline (which cannot pass)')
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(url, key, { auth: { persistSession: false } })
  const base = () => db.from('study_item_bank').select('id,cohort,difficulty,item', { count: 'exact' })
    .eq('family', 'sat').eq('section', 'reading_writing').eq('domain', 'Information and Ideas').eq('verified', true).eq('archived', false)
  const rows = []; let exact = null
  for (let f = 0; ; f += 1000) {
    const { data, error, count } = await base().order('id').range(f, f + 999)
    if (error) die(error.message)
    exact ??= count
    rows.push(...data); if (data.length < 1000) break
  }
  if (rows.length !== exact) die(`paged read ${rows.length} != exact count ${exact}`)
  if (!rows.length) die('zero live I&I rows')
  const textOf = it => it?.passage || it?.prompt || ''
  const noText = rows.filter(r => !textOf(r.item))
  if (noText.length) die(`${noText.length} live rows have neither passage nor prompt`)
  LIVE = rows.map(r => ({ id: r.id, src: r.cohort, passage: textOf(r.item), choices: (r.item?.choices ?? []).map(String), cells: cellsOf(r.item?.graphic) }))
}

/* measures */
const words = s => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean)
const tri = s => { const w = words(s); const out = new Set(); for (let i = 0; i + 2 < w.length; i++) out.add(w.slice(i, i + 3).join(' ')); return out }
const jac = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n) }
const normOpt = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[—–]|--/g, '—').replace(/−/g, '-').replace(/\s+/g, ' ').trim()
const prep = r => ({ ...r, tri: tri(r.passage), on: r.choices.map(normOpt), ok: r.choices.map(normOpt).sort().join(' | ') })
const Cp = C.map(c => prep({ ...c, cells: cellsOf(c.graphic) })), Pp = PRIOR.map(prep), Lp = LIVE ? LIVE.map(prep) : null
const shared = (a, b) => a.on.filter(o => b.on.includes(o)).length

console.log(`${C.length} candidates from ${files.length} file(s) vs PRIOR ${Pp.length} II21/II22 candidate rows (2 frozen batches of 24 + 8 pre-freeze author files of 6) and ${Lp ? `LIVE ${Lp.length} I&I rows (paged = exact count)` : 'LIVE: NOT MEASURED (--offline)'}\n`)
let flagged = 0
for (const c of Cp) {
  const f = []
  const best = pop => { let b = { j: -1, r: null }; for (const r of pop) { const j = jac(c.tri, r.tri); if (j > b.j) b = { j, r } } return b }
  const bp = best(Pp), bl = Lp ? best(Lp) : null
  if (bp.j >= 0.20) f.push(`PASSAGE ${bp.j.toFixed(3)} ~ prior ${bp.r.id} (${bp.r.src})`)
  if (bl && bl.j >= 0.20) f.push(`PASSAGE ${bl.j.toFixed(3)} ~ live ${bl.r.id} (${bl.r.src})`)
  for (const [lab, pop] of [['prior', Pp], ['live', Lp ?? []]]) {
    const same = pop.filter(r => r.ok === c.ok)
    if (same.length) f.push(`OPTION SET = ${lab} ${[...new Set(same.map(r => `${r.id} (${r.src})`))].slice(0, 3).join(', ')}`)
    else { const s3 = pop.filter(r => shared(c, r) >= 3); if (s3.length) f.push(`3+ OPTIONS shared with ${lab} ${s3.slice(0, 3).map(r => r.id).join(', ')}`) }
    if (c.cells) { const t = pop.filter(r => r.cells && r.cells === c.cells); if (t.length) f.push(`TABLE = ${lab} ${t.slice(0, 3).map(r => r.id).join(', ')}`) }
  }
  if (f.length) flagged++
  console.log(`${c.id.padEnd(10)} prior max ${bp.j.toFixed(3)} (${bp.r?.id ?? '-'})  live max ${bl ? `${bl.j.toFixed(3)} (${bl.r?.src ?? '-'})` : 'NOT MEASURED'}${f.length ? '  <- ' + f.join('; ') : ''}`)
}
console.log('\nwithin the candidates:')
let wf = 0
for (let i = 0; i < Cp.length; i++) for (let k = i + 1; k < Cp.length; k++) {
  const j = jac(Cp[i].tri, Cp[k].tri), s = Cp[i].ok === Cp[k].ok, s3 = shared(Cp[i], Cp[k]) >= 3, t = Cp[i].cells && Cp[i].cells === Cp[k].cells
  if (j >= 0.20 || s || s3 || t) { wf++; console.log(`  ${Cp[i].id} ~ ${Cp[k].id}: passage ${j.toFixed(3)}${s ? ', IDENTICAL option set' : s3 ? ', 3+ shared options' : ''}${t ? ', IDENTICAL table' : ''}`) }
}
if (!wf) console.log('  none')
console.log(`\n${flagged} of ${Cp.length} candidates flagged against PRIOR${Lp ? '/LIVE' : ' (LIVE NOT MEASURED)'}; ${wf} within-candidate pair(s). Change flagged items before delivery; a frozen item still flagged is HELD.`)
process.exit(flagged || wf || !Lp ? 1 : 0)
