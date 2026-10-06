#!/usr/bin/env node
/**
 * sec-near-dup.mjs <batch.json> [--exclude-cohort c1,c2] [--domain "<D>"]
 *
 * NEAR-duplicate check for an SAT R&W batch against EVERY live row of the same
 * domain (paged past PostgREST's 1000-row cap, ordered by id, count-asserted),
 * and within the batch. stem-duplicates.mjs (the insert gate) catches EXACT
 * normalised matches only; a paraphrased twin passes it. This prints, per
 * candidate (live text = passage, or the prompt where passage is null):
 *
 *   passage   word-trigram Jaccard against the nearest live passage
 *             (flag >= 0.20: shared phrasing, not just shared topic)
 *   template  the option SKELETON: the token shared by all four options is
 *             removed, other content words become "w", punctuation and a
 *             fixed list of function words are kept. "landscape, but how" ->
 *             ", but how". An identical skeleton SET to a live item means
 *             the same option template (solving one teaches the other).
 *
 * It reports; it does not decide. Read the flagged pairs by hand.
 *
 * Refuses (exit 2) rather than print a number on: an unreadable or empty
 * batch, zero live rows, a paged read whose length disagrees with the exact
 * count, or a batch row with no passage.
 *
 * Self-test against known data: run it on a batch that is already live
 * (e.g. sat-sec-hard-v13.kept.batch.json) WITHOUT --exclude-cohort and every
 * item must find itself at passage 1.000 and template identical; with
 * --exclude-cohort rw-v13-sec-hard none may.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const args = process.argv.slice(2)
const path = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'))
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }
const domain = opt('--domain') ?? 'Standard English Conventions'
const exclude = new Set((opt('--exclude-cohort') ?? '').split(',').filter(Boolean))
if (!path || !existsSync(path)) { console.error('usage: sec-near-dup.mjs <batch.json> [--exclude-cohort c1,c2] [--domain D]'); process.exit(2) }
let batch
try { batch = JSON.parse(readFileSync(path, 'utf8')) } catch (e) { console.error(`REFUSING: cannot read ${path}: ${e.message}`); process.exit(2) }
if (!Array.isArray(batch) || !batch.length) { console.error(`REFUSING: ${path} holds no items`); process.exit(2) }
const noPassage = batch.filter(b => !b.passage)
if (noPassage.length) { console.error(`REFUSING: ${noPassage.length} batch rows have no passage`); process.exit(2) }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('REFUSING: Supabase env not loaded (set -a; source .env.local)'); process.exit(2) }
const db = createClient(url, key, { auth: { persistSession: false } })
const base = () => db.from('study_item_bank').select('id,cohort,difficulty,item', { count: 'exact' })
  .eq('family', 'sat').eq('section', 'reading_writing').eq('domain', domain).eq('verified', true).eq('archived', false)
const rows = []
let exact = null
for (let f = 0; ; f += 1000) {
  const { data, error, count } = await base().order('id').range(f, f + 999)
  if (error) { console.error(`REFUSING: ${error.message}`); process.exit(2) }
  exact ??= count
  rows.push(...data); if (data.length < 1000) break
}
if (rows.length !== exact) { console.error(`REFUSING: paged read ${rows.length} != exact count ${exact}`); process.exit(2) }
/* 48 live v2 SEC rows carry passage=null with the sentence inside `prompt`.
 * Filtering on passage silently dropped them (315 of 363 compared); compare on
 * passage when present, else the prompt, and refuse if any row has neither. */
const textOf = it => it?.passage || it?.prompt || ''
const noText = rows.filter(r => !textOf(r.item))
if (noText.length) { console.error(`REFUSING: ${noText.length} live rows have neither passage nor prompt`); process.exit(2) }
const live = rows.filter(r => !exclude.has(r.cohort))
if (!live.length) { console.error('REFUSING: zero live rows to compare against'); process.exit(2) }

const words = s => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean)
const tri = s => { const w = words(s); const out = new Set(); for (let i = 0; i + 2 < w.length; i++) out.add(w.slice(i, i + 3).join(' ')); return out }
const jac = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n) }
const FN = new Set('and but or so yet for nor however therefore moreover which who whom whose that how why what when where whether while although though because since until unless if as in on of to with by from at even also asking the a an its it\'s their they there is are was were has have had be been being do did does not'.split(' '))
const toks = s => String(s).match(/[A-Za-z0-9'’]+|[^\sA-Za-z0-9'’]/g) ?? []
const skeleton = choices => {
  const T = choices.map(c => toks(c))
  const shared = T[0].filter(t => /[A-Za-z0-9]/.test(t) && T.every(x => x.map(y => y.toLowerCase()).includes(t.toLowerCase())))
  const sh = new Set(shared.map(t => t.toLowerCase()))
  return T.map(x => x.map(t => sh.has(t.toLowerCase()) ? '' : (/[A-Za-z0-9]/.test(t) ? (FN.has(t.toLowerCase()) ? t.toLowerCase() : 'w') : t)).filter(Boolean).join(' ')).sort()
}
const sameSet = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

const L = live.map(r => ({ id: r.id, cohort: r.cohort, difficulty: r.difficulty, tri: tri(textOf(r.item)), sk: skeleton((r.item.choices ?? []).map(String)) }))
console.log(`${path.split('/').pop()}: ${batch.length} candidates vs ${L.length} live ${domain} rows (paged ${rows.length} = exact ${exact}${exclude.size ? `, excluded cohorts ${[...exclude].join(',')}` : ''})\n`)
let flags = 0
const C = batch.map(b => ({ id: b.id, tri: tri(b.passage), sk: skeleton(b.choices.map(String)) }))
for (const c of C) {
  let best = { j: -1 }
  for (const l of L) { const j = jac(c.tri, l.tri); if (j > best.j) best = { j, l } }
  const tmpl = L.filter(l => sameSet(c.sk, l.sk))
  const tmplHard = tmpl.filter(l => l.difficulty === 'hard')
  const f = []
  if (best.j >= 0.20) f.push(`PASSAGE ${best.j.toFixed(3)} ~ ${best.l.id} (${best.l.cohort})`)
  if (tmplHard.length) f.push(`TEMPLATE = live hard ${tmplHard.map(l => `${l.id.slice(0, 8)}(${l.cohort})`).join(', ')}`)
  if (f.length) flags++
  console.log(`${String(c.id).padEnd(11)} passage max ${best.j.toFixed(3)} (${best.l.cohort})  template same as ${tmpl.length} live (${tmplHard.length} hard)  [${c.sk.join(' | ')}]${f.length ? '  <- ' + f.join('; ') : ''}`)
}
console.log('\nwithin batch:')
let wf = 0
for (let i = 0; i < C.length; i++) for (let k = i + 1; k < C.length; k++) {
  const j = jac(C[i].tri, C[k].tri), s = sameSet(C[i].sk, C[k].sk)
  if (j >= 0.20 || s) { wf++; console.log(`  ${C[i].id} ~ ${C[k].id}: passage ${j.toFixed(3)}${s ? ', SAME option template' : ''}`) }
}
if (!wf) console.log('  none')
console.log(`\n${flags} of ${C.length} candidates flagged against live; ${wf} within-batch pair(s). Read flagged pairs by hand.`)
