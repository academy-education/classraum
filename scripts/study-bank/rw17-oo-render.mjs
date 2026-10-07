#!/usr/bin/env node
/**
 * rw17-oo-render.mjs <cs|ii> <frozen.batch.json> --tag T
 *
 * Options-only render for the rw v17 I&I / C&S hard batches with the control
 * PRE-REGISTERED in PREREG-RW17-II-CS-2026-10-07.md. make-oo-render.mjs matches
 * one subskill string and one band; these controls need a SHAPE filter (WIC
 * word vs gloss) and a two-stratum mix (CoE textual vs quantitative) that no
 * single label expresses in the live bank, whose CoE labels are split four ways.
 *
 *   cs: 24 live Words-in-Context, WORD-shaped (score-oo-by-shape rule):
 *       every hard word-shaped + medium word-shaped to 24 (seeded)
 *   ii: 12 hard TEXTUAL CoE ("finding, if true") + 12 QUANTITATIVE CoE
 *       (graphic or a data stem): every hard quantitative, medium to 12 (seeded)
 *
 * Same render rules as make-oo-render: only option strings cross, ids are
 * renumbered L01.., keys dealt round-robin over the whole file, arms
 * interleaved by a seeded shuffle, the realised per-arm letter line printed.
 * Key file carries kind (candidate | live-control) so score-oo.mjs splits arms,
 * plus stratum and band for sub-arm reads.
 *
 * Refuses (exit 2): unreadable/empty batch, mixed widths, a key not among the
 * choices, a paged read whose length disagrees with the exact count, or a pool
 * smaller than the pre-registered draw.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { rng, shuffleWith } from './seeded-shuffle.mjs'

const args = process.argv.slice(2)
const mode = args[0], path = args[1]
const ti = args.indexOf('--tag'); const tag = ti >= 0 ? args[ti + 1] : null
if (!['cs', 'ii'].includes(mode) || !path || !tag) { console.error('usage: rw17-oo-render.mjs <cs|ii> <batch.json> --tag T'); process.exit(2) }
if (!existsSync(path)) { console.error(`REFUSING: ${path} does not exist`); process.exit(2) }
const batch = JSON.parse(readFileSync(path, 'utf8'))
if (!Array.isArray(batch) || !batch.length) { console.error('REFUSING: empty batch'); process.exit(2) }
if (batch.some(it => (it.choices ?? []).length !== 4)) { console.error('REFUSING: every item must be four-choice'); process.exit(2) }

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { count, error: ce } = await db.from('study_item_bank').select('id', { count: 'exact', head: true })
  .eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false)
if (ce) throw new Error(ce.message)
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,cohort,domain,difficulty,subskill,item')
    .eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false)
    .order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data); if (data.length < 1000) break
}
if (rows.length !== count || new Set(rows.map(r => r.id)).size !== count) { console.error(`REFUSING: paged ${rows.length} rows vs exact count ${count}`); process.exit(2) }
const ok = r => Array.isArray(r.item?.choices) && r.item.choices.length === 4 && r.item.choices.map(String).includes(String(r.item.correct_answer))
const sub = r => String(r.subskill ?? r.item?.subskill ?? '')
const isGloss = ch => { const multi = ch.filter(c => String(c).trim().split(/\s+/).length > 1).length; const mean = ch.reduce((s, c) => s + String(c).length, 0) / ch.length; return multi >= 3 && mean > 12 }
const isQuant = r => !!r.item?.graphic || /data|table|graph|chart|figure/i.test(String(r.item?.prompt ?? ''))
const candCohorts = new Set(['rw-v17-wic-hard', 'rw-v17-ii-hard'])
const rand = rng(20261007)

let ctl = []
if (mode === 'cs') {
  const pool = rows.filter(r => ok(r) && !candCohorts.has(r.cohort) && r.domain === 'Craft and Structure' && /words in context/i.test(sub(r)) && !isGloss(r.item.choices))
  const hard = pool.filter(r => r.difficulty === 'hard'), med = shuffleWith(pool.filter(r => r.difficulty === 'medium'), rand)
  console.log(`control pool: WIC word-shaped hard ${hard.length}, medium ${med.length} (of ${rows.length} live R&W)`)
  if (hard.length + med.length < 24) { console.error('REFUSING: pool smaller than 24'); process.exit(2) }
  ctl = [...hard.map(r => ({ r, stratum: 'wic-word' })), ...med.slice(0, 24 - hard.length).map(r => ({ r, stratum: 'wic-word' }))]
} else {
  const coe = rows.filter(r => ok(r) && !candCohorts.has(r.cohort) && r.domain === 'Information and Ideas' && /evidence/i.test(sub(r)))
  const text = shuffleWith(coe.filter(r => !isQuant(r) && r.difficulty === 'hard'), rand)
  const qh = coe.filter(r => isQuant(r) && r.difficulty === 'hard'), qm = shuffleWith(coe.filter(r => isQuant(r) && r.difficulty === 'medium'), rand)
  console.log(`control pool: CoE textual hard ${text.length}; quantitative hard ${qh.length}, medium ${qm.length} (of ${rows.length} live R&W)`)
  if (text.length < 12 || qh.length + qm.length < 12) { console.error('REFUSING: pool smaller than the pre-registered 12 + 12'); process.exit(2) }
  ctl = [...text.slice(0, 12).map(r => ({ r, stratum: 'coe-textual' })), ...[...qh, ...qm].slice(0, 12).map(r => ({ r, stratum: 'coe-quant' }))]
}

const candStratum = it => mode === 'cs' ? 'wic-word' : (it.graphic ? 'coe-quant' : 'coe-textual')
const L = ['A', 'B', 'C', 'D']
/* Letters are dealt round-robin WITHIN each arm (so each arm's own letter line
 * is 25.0% when its n is a multiple of 4), and only then are the arms
 * interleaved. Dealing over the already-interleaved file left the arms at
 * 43.8% / 33.3% on the self-test, i.e. a control that was not flat. */
const armDeal = list => list.map((x, i) => ({ ...x, want: L[i % 4] }))
const all = shuffleWith([
  ...armDeal(shuffleWith(batch.map(it => ({ kind: 'candidate', localId: it.id, stratum: candStratum(it), band: it.difficulty ?? null, choices: it.choices.map(String), key: String(it.correct_answer), cohort: null })), rand)),
  ...armDeal(shuffleWith(ctl.map(({ r, stratum }) => ({ kind: 'live-control', localId: r.id, stratum, band: r.difficulty, choices: r.item.choices.map(String), key: String(r.item.correct_answer), cohort: r.cohort })), rand)),
], rand)
const blind = {}, key = {}
all.forEach((x, i) => {
  const ci = x.choices.indexOf(x.key)
  if (ci < 0) { console.error(`REFUSING: ${x.localId} key not among choices`); process.exit(2) }
  const want = x.want
  const rest = shuffleWith(x.choices.filter((_, j) => j !== ci), rand)
  let q = 0
  const out = L.map(l => (l === want ? x.choices[ci] : rest[q++]))
  const bid = `L${String(i + 1).padStart(2, '0')}`
  blind[bid] = { options: Object.fromEntries(L.map((l, j) => [l, out[j]])) }
  key[bid] = { letter: want, localId: x.localId, kind: x.kind, stratum: x.stratum, band: x.band, cohort: x.cohort }
})
const bf = `scripts/study-bank/${tag}-oo.blind.json`, kf = `scripts/study-bank/${tag}-oo.key.json`
writeFileSync(bf, JSON.stringify(blind, null, 1) + '\n')
writeFileSync(kf, JSON.stringify(key, null, 1) + '\n')
const line = ids => { const d = {}; for (const id of ids) d[key[id].letter] = (d[key[id].letter] ?? 0) + 1; return { d, line: 100 * Math.max(...Object.values(d)) / ids.length } }
console.log(`${tag}: ${all.length} items (${batch.length} candidate + ${ctl.length} live control)`)
for (const [label, f] of [['candidate', k => k.kind === 'candidate'], ['live-control', k => k.kind === 'live-control']]) {
  const ids = Object.keys(key).filter(id => f(key[id])); const { d, line: ln } = line(ids)
  console.log(`  ${label.padEnd(13)} n=${ids.length} deal ${JSON.stringify(d)} best-fixed-letter ${ln.toFixed(1)}%`)
}
const cc = {}; for (const k of Object.values(key)) if (k.kind === 'live-control') { const c = `${k.stratum}/${k.band}/${k.cohort}`; cc[c] = (cc[c] ?? 0) + 1 }
console.log(`  control composition ${JSON.stringify(cc)}`)
console.log(`  blind sha ${createHash('sha256').update(readFileSync(bf)).digest('hex').slice(0, 16)}`)
console.log(`  wrote ${bf}\n  wrote ${kf}`)
