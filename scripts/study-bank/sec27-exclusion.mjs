#!/usr/bin/env node
/**
 * sec27-exclusion.mjs <items.json|batch.json> [more.json ...] [--offline]
 *
 * The duplicate-exclusion check of PREREG-SEC27-2026-10-23.md ("Exclusion"). It applies
 * v22 Amendment 2's hold rule, unchanged, to TWO reference populations instead of one:
 *
 *   LIVE   every live SAT R&W Standard English Conventions row (verified, not archived),
 *          paged past PostgREST's 1000-row cap, ordered by id, count-asserted
 *          (read-only; the same query as sec-near-dup.mjs);
 *   PRIOR  every SEC22-SEC26 CANDIDATE, kept, held or dropped: the five frozen batches
 *          (sat-sec-hard-v2{2,3,4}.batch.json, 24 items each, sat-sec-hard-v25.batch.json, 32,
 *          and sat-sec-hard-v26.batch.json, 40; refused otherwise) plus the authors'
 *          pre-freeze files (sat-sec-v2{2,3,4,5,6}-work/{A,B,C,D}/items.json), so an item
 *          replaced before a freeze is excluded too. (v26): v25 added. NEW (v27): v26 added
 *          (40 frozen, authors A-D, their post-revision files).
 *
 * A candidate is FLAGGED (to be changed before delivery, HELD if still flagged at
 * freeze) when, against any reference row:
 *   - its passage word-trigram Jaccard is >= 0.20, or
 *   - its option set is IDENTICAL as strings (case, whitespace, curly quotes and dash
 *     variants normalised; order ignored).
 * Within the candidate files, the same two rules are applied pairwise.
 * Option SKELETON matches are not a hold (Amendment 2): every verb 2x2 shares one.
 *
 * EXIT
 *   2  refused: no candidate file, a missing/unreadable/empty file, an item without a
 *      passage or without 4 string choices, duplicate candidate ids, a frozen prior
 *      batch missing or not 24 items, an empty pre-freeze file, no Supabase env (without
 *      --offline), a paged read whose length disagrees with the exact count, zero live
 *      rows, or a live row with neither passage nor prompt.
 *   1  computed, and a candidate is flagged; or --offline (LIVE is then NOT MEASURED,
 *      and a run that did not read the live bank cannot pass).
 *   0  computed against both populations, nothing flagged.
 *
 * Self-test (run before use, PREREG-SEC27 Scripts): sat-sec-hard-v26.batch.json must
 * flag 40/40 against PRIOR at Jaccard 1.000 with identical option sets and find its 14
 * inserted items in LIVE at 1.000; the table's seven auxiliary option sets (shared rarely,
 * usually, too, often, always, also, rarely) must not match any prior or live set.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const die = m => { console.error(`REFUSING: ${m}`); process.exit(2) }
const args = process.argv.slice(2)
const offline = args.includes('--offline')
for (const a of args) if (a.startsWith('--') && a !== '--offline') die(`unknown flag ${a}`)
const files = args.filter(a => !a.startsWith('--'))
if (!files.length) { console.error('usage: sec27-exclusion.mjs <items.json|batch.json> [more.json ...] [--offline]'); process.exit(2) }
const D = dirname(fileURLToPath(import.meta.url))
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

/* candidates */
const C = []
for (const f of files) for (const it of readArr(f, 'candidate file')) { checkItem(it, f); C.push({ ...it, _file: f }) }
const cids = C.map(c => c.id)
if (new Set(cids).size !== cids.length) die('duplicate candidate ids across the files given')

/* prior candidates: frozen batches (24 each) + pre-freeze author files */
const PRIOR = []
const PRIOR_N = { 22: 24, 23: 24, 24: 24, 25: 32, 26: 40 }   // (v26): v25 froze 32. NEW (v27): v26 froze 40
for (const v of [22, 23, 24, 25, 26]) {
  const fb = join(D, `sat-sec-hard-v${v}.batch.json`)
  const b = readArr(fb, 'frozen prior batch')
  if (b.length !== PRIOR_N[v]) die(`${fb} holds ${b.length} items, not ${PRIOR_N[v]}: the prior population would be incomplete`)
  for (const it of b) { checkItem(it, fb); PRIOR.push({ id: it.id, src: `v${v} frozen`, passage: it.passage, choices: it.choices }) }
  for (const a of ['A', 'B', 'C', 'D']) {
    const fw = join(D, `sat-sec-v${v}-work`, a, 'items.json')
    if (!existsSync(fw)) continue
    for (const it of readArr(fw, 'pre-freeze file')) { checkItem(it, fw); PRIOR.push({ id: it.id, src: `v${v} pre-freeze ${a}`, passage: it.passage, choices: it.choices }) }
  }
}

/* live */
let LIVE = null
if (!offline) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) die('Supabase env not loaded (set -a; source .env.local; set +a), or pass --offline (which cannot pass)')
  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(url, key, { auth: { persistSession: false } })
  const base = () => db.from('study_item_bank').select('id,cohort,difficulty,item', { count: 'exact' })
    .eq('family', 'sat').eq('section', 'reading_writing').eq('domain', 'Standard English Conventions').eq('verified', true).eq('archived', false)
  const rows = []; let exact = null
  for (let f = 0; ; f += 1000) {
    const { data, error, count } = await base().order('id').range(f, f + 999)
    if (error) die(error.message)
    exact ??= count
    rows.push(...data); if (data.length < 1000) break
  }
  if (rows.length !== exact) die(`paged read ${rows.length} != exact count ${exact}`)
  if (!rows.length) die('zero live SEC rows')
  const textOf = it => it?.passage || it?.prompt || ''
  const noText = rows.filter(r => !textOf(r.item))
  if (noText.length) die(`${noText.length} live rows have neither passage nor prompt`)
  LIVE = rows.map(r => ({ id: r.id, src: r.cohort, passage: textOf(r.item), choices: (r.item?.choices ?? []).map(String) }))
}

/* measures (trigram Jaccard as sec-near-dup.mjs) */
const words = s => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean)
const tri = s => { const w = words(s); const out = new Set(); for (let i = 0; i + 2 < w.length; i++) out.add(w.slice(i, i + 3).join(' ')); return out }
const jac = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n) }
const normOpt = s => String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[—–]|--/g, '—').replace(/\s+/g, ' ').trim()
const optKey = ch => ch.map(normOpt).sort().join(' | ')
const prep = r => ({ ...r, tri: tri(r.passage), ok: optKey(r.choices) })
const Cp = C.map(prep), Pp = PRIOR.map(prep), Lp = LIVE ? LIVE.map(prep) : null

console.log(`${C.length} candidates from ${files.length} file(s) vs PRIOR ${Pp.length} SEC22-26 candidate rows (3 frozen batches of 24, v25's 32, v26's 40, + pre-freeze author files) and ${Lp ? `LIVE ${Lp.length} SEC rows (paged = exact count)` : 'LIVE: NOT MEASURED (--offline)'}\n`)
let flagged = 0
for (const c of Cp) {
  const f = []
  const best = (pop) => { let b = { j: -1, r: null }; for (const r of pop) { const j = jac(c.tri, r.tri); if (j > b.j) b = { j, r } } return b }
  const bp = best(Pp), bl = Lp ? best(Lp) : null
  if (bp.j >= 0.20) f.push(`PASSAGE ${bp.j.toFixed(3)} ~ prior ${bp.r.id} (${bp.r.src})`)
  if (bl && bl.j >= 0.20) f.push(`PASSAGE ${bl.j.toFixed(3)} ~ live ${bl.r.id} (${bl.r.src})`)
  const sameP = Pp.filter(r => r.ok === c.ok), sameL = Lp ? Lp.filter(r => r.ok === c.ok) : []
  if (sameP.length) f.push(`OPTION SET = prior ${[...new Set(sameP.map(r => `${r.id} (${r.src})`))].join(', ')}`)
  if (sameL.length) f.push(`OPTION SET = live ${sameL.map(r => `${r.id} (${r.src})`).join(', ')}`)
  if (f.length) flagged++
  console.log(`${c.id.padEnd(11)} prior max ${bp.j.toFixed(3)} (${bp.r?.id ?? '-'})  live max ${bl ? `${bl.j.toFixed(3)} (${bl.r?.src ?? '-'})` : 'NOT MEASURED'}${f.length ? '  <- ' + f.join('; ') : ''}`)
}
console.log('\nwithin the candidates:')
let wf = 0
for (let i = 0; i < Cp.length; i++) for (let k = i + 1; k < Cp.length; k++) {
  const j = jac(Cp[i].tri, Cp[k].tri), s = Cp[i].ok === Cp[k].ok
  if (j >= 0.20 || s) { wf++; console.log(`  ${Cp[i].id} ~ ${Cp[k].id}: passage ${j.toFixed(3)}${s ? ', IDENTICAL option set' : ''}`) }
}
if (!wf) console.log('  none')
console.log(`\n${flagged} of ${Cp.length} candidates flagged against PRIOR${Lp ? '/LIVE' : ' (LIVE NOT MEASURED)'}; ${wf} within-candidate pair(s). Change flagged items before delivery; a frozen item still flagged is HELD.`)
process.exit(flagged || wf || !Lp ? 1 : 0)
