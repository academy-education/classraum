#!/usr/bin/env node
/**
 * act-english-v8-dupscan.mjs <expectedCount> <batch.json...>
 *
 * Duplicate scan for an ACT English candidate batch against EVERY non-archived
 * ACT English row in the bank (verified AND staged — a staged cohort can be
 * released later), paged past PostgREST's 1000-row cap with an ORDER BY and a
 * distinct-id assertion, plus within the batch. Pre-registered in
 * act-english-v8.PREREG.md bar 2.
 *
 * Channels, each printed with its denominator:
 *   - passage: token Jaccard (lowercased words of 4+ letters) between each
 *     candidate passage and each bank passage; FLAG >= 0.30, near >= 0.20
 *   - title: identical normalised passage_title = FLAG
 *   - stem: token Jaccard over the item prompt; FLAG >= 0.60, near >= 0.45
 * Flags are for reading by hand.
 *
 * Break-test: PLANT=1 appends a copy of the first bank passage (and its first
 * stem) to the candidates; the run must then report a FLAG on it, or the scan
 * is not looking at the bank and exits 3.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [expected, ...paths] = process.argv.slice(2)
if (!expected || !paths.length) { console.error('usage: act-english-v8-dupscan.mjs <expectedCount> <batch.json...>'); process.exit(2) }
const batch = paths.flatMap(p => JSON.parse(readFileSync(p, 'utf8')))
if (batch.length !== Number(expected)) { console.error(`REFUSING: read ${batch.length} items, expected ${expected}`); process.exit(2) }

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const live = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,cohort,verified,passage_group_id,item')
    .eq('family', 'act').eq('section', 'english').eq('archived', false).order('id').range(f, f + 999)
  if (error) throw new Error(error.message)
  live.push(...data); if (data.length < 1000) break
}
if (new Set(live.map(r => r.id)).size !== live.length) { console.error('REFUSING: paging slipped (duplicate ids)'); process.exit(2) }
if (live.length < 300) { console.error(`REFUSING: only ${live.length} ACT English rows read — the read is incomplete`); process.exit(2) }

const words = s => new Set(String(s ?? '').toLowerCase().replace(/\[[0-9a-d]\]/gi, ' ').match(/[a-z]{4,}/g) ?? [])
const stemToks = s => new Set(String(s ?? '').toLowerCase().match(/[a-z0-9]{2,}/g) ?? [])
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1) }
const normTitle = s => String(s ?? '').toLowerCase().replace(/[^a-z]+/g, ' ').trim()

const bankP = {}
for (const r of live) (bankP[r.passage_group_id] ??= { gid: r.passage_group_id, cohort: r.cohort, verified: r.verified, title: r.item?.passage_title ?? '', text: r.item?.passage ?? '' })
const BP = Object.values(bankP).map(p => ({ ...p, w: words(p.text), t: normTitle(p.title) }))
const BS = live.map(r => ({ id: r.id, cohort: r.cohort, prompt: r.item?.prompt ?? '', t: stemToks(r.item?.prompt) }))
const vc = live.filter(r => r.verified).length
console.log(`bank ACT English rows read: ${live.length} (${vc} verified, ${live.length - vc} staged) in ${BP.length} passages; candidates: ${batch.length}`)

const cands = [...batch]
if (process.env.PLANT === '1') {
  const r0 = live[0]
  cands.push({ id: 'PLANTED-COPY', passage_id: 'PLANT', passage_title: r0.item?.passage_title, passage: r0.item?.passage, prompt: r0.item?.prompt })
}
const CP = {}
for (const it of cands) (CP[it.passage_id] ??= { pid: it.passage_id, title: it.passage_title ?? '', text: it.passage })
const CPL = Object.values(CP).map(p => ({ ...p, w: words(p.text), t: normTitle(p.title) }))

let flags = 0, near = 0
const flagged = new Set()
console.log('\n-- passages --')
for (const c of CPL) {
  const scored = BP.map(b => ({ b, j: jac(c.w, b.w), same: c.t && c.t === b.t })).sort((x, y) => y.j - x.j)
  const top = scored[0]
  for (const h of scored.filter(h => h.j >= 0.20 || h.same)) {
    const flag = h.j >= 0.30 || h.same
    if (flag) { flags++; flagged.add(c.pid) } else near++
    console.log(`${flag ? 'FLAG' : 'near'} ${c.pid} "${c.title}" ~ ${h.b.cohort} "${h.b.title}" jaccard ${h.j.toFixed(3)}${h.same ? ' SAME TITLE' : ''}`)
  }
  console.log(`  ${c.pid} "${c.title}": max passage jaccard ${top.j.toFixed(3)} vs ${top.b.cohort} "${top.b.title}" (of ${BP.length})`)
  for (const c2 of CPL) if (c2.pid > c.pid) {
    const j = jac(c.w, c2.w)
    if (j >= 0.20) { const flag = j >= 0.30; if (flag) flags++; else near++; console.log(`${flag ? 'FLAG' : 'near'} WITHIN ${c.pid} ~ ${c2.pid} jaccard ${j.toFixed(3)}`) }
  }
}
console.log('\n-- stems --')
let maxStem = 0
for (const it of cands) {
  const t = stemToks(it.prompt)
  for (const r of BS) {
    const j = jac(t, r.t); if (j > maxStem) maxStem = j
    if (j >= 0.45) { const flag = j >= 0.60; if (flag) { flags++; flagged.add(it.passage_id) } else near++; console.log(`${flag ? 'FLAG' : 'near'} ${it.id} ~ ${r.cohort} ${r.id.slice(0, 8)} stem jaccard ${j.toFixed(2)}\n      cand: ${it.prompt.slice(0, 130)}\n      bank: ${r.prompt.slice(0, 130)}`) }
  }
}
console.log(`\n${CPL.length} candidate passages vs ${BP.length} bank passages, ${cands.length} stems vs ${BS.length} bank stems (+ within batch): ${flags} FLAG, ${near} near; max stem jaccard ${maxStem.toFixed(2)}`)
if (process.env.PLANT === '1') {
  if (!flagged.has('PLANT')) { console.error('BREAK-TEST FAILED: the planted bank copy was not flagged'); process.exit(3) }
  console.log('break-test OK: the planted bank copy was flagged')
}
