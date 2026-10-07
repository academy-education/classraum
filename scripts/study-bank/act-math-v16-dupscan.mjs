#!/usr/bin/env node
/**
 * act-math-v16-dupscan.mjs <expectedCount> <batch.json...>
 *
 * Duplicate scan for a maths candidate batch against EVERY live maths row in
 * EVERY family (sat, act, ssat, isee), paged past PostgREST's 1000-row cap with
 * an ORDER BY and a distinct-id assertion, plus within the batch.
 *
 * Two channels, both printed with their denominators:
 *   - stem similarity: Jaccard over normalised word+number tokens (len >= 2),
 *     reported at >= 0.45, flagged at >= 0.60 (the pre-registered read-by-hand bar)
 *   - option-set identity: the four values parsed numerically when possible, so
 *     "3/4" and "0.75" collide; identical sets are always flagged
 * Flags are for reading by hand; a same-mechanism pair is the drop, decided by
 * a reader, not by this score.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const [expected, ...paths] = process.argv.slice(2)
if (!expected || !paths.length) { console.error('usage: act-math-v16-dupscan.mjs <expectedCount> <batch.json...>'); process.exit(2) }
const batch = paths.flatMap(p => JSON.parse(readFileSync(p, 'utf8')))
if (batch.length !== Number(expected)) { console.error(`REFUSING: read ${batch.length} items, expected ${expected}`); process.exit(2) }

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const live = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,family,domain,cohort,item')
    .eq('section', 'math').eq('verified', true).eq('archived', false).order('id').range(f, f + 999)
  if (error) throw new Error(error.message)
  live.push(...data); if (data.length < 1000) break
}
if (new Set(live.map(r => r.id)).size !== live.length) { console.error('REFUSING: paging slipped'); process.exit(2) }
const fam = {}; for (const r of live) fam[r.family] = (fam[r.family] ?? 0) + 1
console.log(`live math rows read: ${live.length} ${JSON.stringify(fam)}   candidates: ${batch.length}`)
if (live.length < 2000) { console.error('REFUSING: fewer than 2000 live math rows — the read is incomplete'); process.exit(2) }

const norm = s => String(s ?? '').toLowerCase().replace(/[−]/g, '-').replace(/[^a-z0-9.]+/g, ' ').trim()
const toks = s => new Set(norm(s).split(' ').filter(w => w.length >= 2))
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1) }
const val = c => {
  const t = String(c).replace(/[$,\s]/g, '').replace(/−/g, '-')
  if (/^-?\d+\/-?\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return b ? (a / b).toFixed(6) : t }
  if (/^-?\d*\.?\d+%?$/.test(t)) return Number(t.replace('%', '')).toFixed(6)
  return norm(c)
}
const optKey = ch => (ch ?? []).map(val).sort().join('|')

const L = live.map(r => ({ id: r.id, family: r.family, domain: r.domain, cohort: r.cohort, prompt: r.item?.prompt ?? '', t: toks(r.item?.prompt), o: optKey(r.item?.choices) }))
const C = batch.map(it => ({ id: it.id, domain: it.domain, prompt: it.prompt, t: toks(it.prompt), o: optKey(it.choices) }))

let flags = 0, near = 0
for (const c of C) {
  const hits = []
  for (const r of L) {
    const j = jac(c.t, r.t)
    if (j >= 0.45 || c.o === r.o) hits.push({ j, same: c.o === r.o, r })
  }
  for (const c2 of C) if (c2.id !== c.id && c2.id > c.id) {
    const j = jac(c.t, c2.t)
    if (j >= 0.45 || c.o === c2.o) hits.push({ j, same: c.o === c2.o, r: { id: c2.id, family: 'WITHIN', domain: c2.domain, cohort: 'v16', prompt: c2.prompt } })
  }
  hits.sort((a, b) => b.j - a.j)
  for (const h of hits.slice(0, 4)) {
    const flag = h.j >= 0.6 || h.same
    if (flag) flags++; else near++
    console.log(`${flag ? 'FLAG' : 'near'} ${c.id} [${c.domain}] ~ ${h.r.family}/${h.r.cohort} ${String(h.r.id).slice(0, 8)} [${h.r.domain}] jaccard ${h.j.toFixed(2)}${h.same ? ' SAME OPTION SET' : ''}`)
    console.log(`      cand: ${c.prompt.slice(0, 140)}`)
    console.log(`      othr: ${String(h.r.prompt).slice(0, 140)}`)
  }
}
console.log(`\n${C.length} candidates scanned against ${L.length} live rows + within-batch: ${flags} flag(s) (>=0.60 or identical option set), ${near} near (0.45-0.60)`)
