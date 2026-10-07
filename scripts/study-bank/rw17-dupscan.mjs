#!/usr/bin/env node
/**
 * rw17-dupscan.mjs <batch.json> [...] [--exclude-cohort c1,c2]
 *
 * Duplicate scan for SAT R&W candidates against EVERY live SAT R&W row (all
 * four domains; paged by id, refuses unless the paged length equals the exact
 * count and every id is distinct), and within the candidate files.
 * sec-near-dup.mjs covers one domain and its option skeleton is meaningless
 * for single-word options (every WIC set skeletonises to "w w w w"), so this
 * prints, per candidate:
 *
 *   passage  max word-trigram Jaccard vs any live passage (passage, or prompt
 *            where passage is null) — FLAG >= 0.20
 *   options  max number of the four options shared verbatim (case/space
 *            folded) with one live item — FLAG >= 3
 *   wic-key  the key is the key of a live Words-in-Context item — FLAG
 *
 * It reports; held/kept is decided by the pre-registration. Exit 1 if
 * anything is flagged, 2 on unreadable input.
 *
 * Self-test: run on a file that is already live (sat-wic-v7.kept.batch.json)
 * and every item must find itself at passage 1.000 / options 4; with
 * --exclude-cohort rw-v16-wic none may.
 */
import { readFileSync, existsSync } from 'node:fs'
const args = process.argv.slice(2)
const xi = args.indexOf('--exclude-cohort')
const exclude = new Set(xi >= 0 ? String(args[xi + 1]).split(',').filter(Boolean) : [])
const paths = args.filter((a, i) => !a.startsWith('--') && (xi < 0 || i !== xi + 1))
if (!paths.length) { console.error('usage: rw17-dupscan.mjs <batch.json> [...] [--exclude-cohort c]'); process.exit(2) }
const cand = []
for (const p of paths) {
  if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) }
  const b = JSON.parse(readFileSync(p, 'utf8'))
  if (!Array.isArray(b) || !b.length) { console.error(`REFUSING: ${p} empty`); process.exit(2) }
  for (const it of b) { if (!it.passage && !it.prompt) { console.error(`REFUSING: ${it.id} has no text`); process.exit(2) } cand.push(it) }
}
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]))
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { count, error: ce } = await db.from('study_item_bank').select('id', { count: 'exact', head: true })
  .eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false)
if (ce) throw new Error(ce.message)
const rows = []
for (let f = 0; ; f += 1000) {
  const { data, error } = await db.from('study_item_bank').select('id,cohort,domain,subskill,item')
    .eq('family', 'sat').eq('section', 'reading_writing').eq('verified', true).eq('archived', false)
    .order('id', { ascending: true }).range(f, f + 999)
  if (error) throw new Error(error.message)
  rows.push(...data); if (data.length < 1000) break
}
if (rows.length !== count || new Set(rows.map(r => r.id)).size !== count) { console.error(`REFUSING: paged ${rows.length} vs exact ${count}`); process.exit(2) }
const live = rows.filter(r => !exclude.has(r.cohort))
const words = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean)
const tri = s => { const w = words(s); const t = new Set(); for (let i = 0; i + 2 < w.length; i++) t.add(w.slice(i, i + 3).join(' ')); return t }
const jac = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / (a.size + b.size - n) }
const fold = s => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
const liveT = live.map(r => ({ r, t: tri(r.item?.passage ?? r.item?.prompt), o: new Set((r.item?.choices ?? []).map(fold)) }))
const wicKeys = new Map(live.filter(r => /words in context/i.test(String(r.subskill ?? r.item?.subskill ?? ''))).map(r => [fold(r.item?.correct_answer), r.id]))
console.log(`live SAT R&W rows compared: ${live.length} (paged ${rows.length} = exact ${count}; excluded cohorts: ${[...exclude].join(',') || 'none'}); live WIC keys ${wicKeys.size}; candidates ${cand.length}`)
let flagged = 0
const cT = cand.map(it => ({ it, t: tri(it.passage ?? it.prompt), o: new Set(it.choices.map(fold)) }))
for (const { it, t, o } of cT) {
  let bp = { j: 0, id: null }, bo = { n: 0, id: null }
  for (const L of liveT) {
    const j = jac(t, L.t); if (j > bp.j) bp = { j, id: L.r.id, c: L.r.cohort }
    let n = 0; for (const x of o) if (L.o.has(x)) n++; if (n > bo.n) bo = { n, id: L.r.id, c: L.r.cohort }
  }
  const wk = /words in context/i.test(it.subskill ?? '') ? wicKeys.get(fold(it.correct_answer)) : undefined
  const f = []
  if (bp.j >= 0.20) f.push(`PASSAGE ${bp.j.toFixed(3)} ~ ${bp.id}`)
  if (bo.n >= 3) f.push(`OPTIONS ${bo.n}/4 ~ ${bo.id}`)
  if (wk) f.push(`WIC-KEY "${it.correct_answer}" is live key of ${wk}`)
  if (f.length) flagged++
  console.log(`${f.length ? 'FLAG' : 'ok  '}  ${String(it.id).padEnd(10)} passage max ${bp.j.toFixed(3)} (${bp.c ?? '-'})  options max ${bo.n}/4  ${f.join(' | ')}`)
}
let within = 0
for (let i = 0; i < cT.length; i++) for (let k = i + 1; k < cT.length; k++) {
  const j = jac(cT[i].t, cT[k].t); let n = 0; for (const x of cT[i].o) if (cT[k].o.has(x)) n++
  const sameKey = fold(cT[i].it.correct_answer) === fold(cT[k].it.correct_answer)
  if (j >= 0.20 || n >= 2 || sameKey) { within++; console.log(`WITHIN  ${cT[i].it.id} ~ ${cT[k].it.id}  passage ${j.toFixed(3)}  shared options ${n}${sameKey ? '  SAME KEY' : ''}`) }
}
console.log(`flagged vs live: ${flagged} of ${cand.length}; within-batch pairs flagged: ${within}`)
process.exit(flagged || within ? 1 : 0)
