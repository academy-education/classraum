#!/usr/bin/env node
/**
 * algf26-verdict.mjs — applies PREREG-ALGF26-2026-10-08.md stage 2 to the three graders' stage-2 files
 * (algf26.ws-{d,e,f}-{h1,h2}.json). Reads ONLY stage-2 fields for drop signals; stage-1 fields are
 * printed as leads for the hand-confirmed rules (4 key-free, 7, 8, 9, 10), never counted on their own.
 * Mechanical rules: R1 key disputed (key_ok false), R2 not exclusive by majority, R3 weak by majority,
 * R4 median n_struck >= 2, R6 plug-back routine by majority, EXT-1 any drop_recommend, HOLD
 * on_blueprint false by majority. Difficulty = median of difficulty_final. Easy cap: inserted easy
 * <= max(1, round(0.021 x kept)); panel-median easy past the cap (original id order) are held.
 * Refuses (exit 2) unless every frozen id has exactly 3 stage-2 grades. Writes nothing unless --write:
 *   sat-math-v26-algfull.kept.batch.json, .held.batch.json, .dropped.json, malgf26.qc.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
const D = 'scripts/study-bank'
const frozen = JSON.parse(readFileSync(`${D}/sat-math-v26-algfull.batch.json`, 'utf8'))
const G = {}
for (const g of ['d', 'e', 'f']) for (const h of ['h1', 'h2']) {
  const p = `${D}/algf26.ws-${g}-${h}.json`
  if (!existsSync(p)) { console.error(`REFUSING: missing ${p}`); process.exit(2) }
  const o = JSON.parse(readFileSync(p, 'utf8'))
  for (const [id, r] of Object.entries(o)) if (id.startsWith('SM26F')) (G[id] ??= {})[g] = r
}
for (const it of frozen) if (Object.keys(G[it.id] ?? {}).length !== 3) { console.error(`REFUSING: ${it.id} has ${Object.keys(G[it.id] ?? {}).length} grades`); process.exit(2) }
const R = ['easy', 'medium', 'hard']
const med = a => a.slice().sort((x, y) => x - y)[1]
const out = []
for (const it of frozen) {
  const gs = Object.values(G[it.id]); const why = []
  const maj = f => gs.filter(f).length >= 2
  if (gs.some(r => r.key_ok === false)) why.push('R1 key disputed')
  if (maj(r => r.exclusive === false)) why.push('R2 not exclusive')
  if (maj(r => r.distractors_weak === true)) why.push('R3 weak')
  const ns = med(gs.map(r => Number(r.n_struck ?? (r.struck ?? []).length)))
  if (ns >= 2) why.push(`R4 median struck ${ns}`)
  if (maj(r => r.plugback_routine === true)) why.push('R6 plug-back')
  const ext = Object.entries(G[it.id]).filter(([, r]) => r.drop_recommend).map(([g, r]) => `${g.toUpperCase()}: ${r.drop_reason}`)
  if (ext.length) why.push('EXT-1')
  const hold = maj(r => r.on_blueprint === false)
  const diff = R[med(gs.map(r => R.indexOf(r.difficulty_final ?? r.difficulty)))]
  const leads = Object.entries(G[it.id]).flatMap(([g, r]) => [r.key_identifiable_free && `${g}:key-free`, r.one_sided && `${g}:one-sided`, r.arith_tell && `${g}:arith`].filter(Boolean))
  out.push({ id: it.id, diff, verdict: hold ? 'HOLD' : why.length ? 'DROP' : 'KEEP', why, ext, leads, struck: gs.map(r => r.n_struck), diffs: gs.map(r => r.difficulty_final ?? r.difficulty).join('/') })
}
for (const o of out) console.log(`${o.id} ${o.verdict.padEnd(4)} ${o.diff.padEnd(6)} [${o.diffs}] struck ${o.struck.join(',')} ${o.why.join('; ')}${o.leads.length ? '  leads ' + o.leads.join(' ') : ''}`)
for (const o of out.filter(o => o.ext.length)) console.log(`  EXT ${o.id}: ${o.ext.join(' | ')}`)
const pass = out.filter(o => o.verdict === 'KEEP')
const easy = pass.filter(o => o.diff === 'easy').sort((a, b) => a.id.localeCompare(b.id))
const nonEasy = pass.filter(o => o.diff !== 'easy')
const cap = Math.max(1, Math.round(0.021 * (nonEasy.length + Math.min(1, easy.length))))
const keptIds = new Set([...nonEasy.map(o => o.id), ...easy.slice(0, cap).map(o => o.id)])
const heldEasy = easy.slice(cap).map(o => o.id)
console.log(`\nfrozen ${frozen.length}: pass ${pass.length} (easy ${easy.length}, medium ${pass.filter(o => o.diff === 'medium').length}, hard ${pass.filter(o => o.diff === 'hard').length}); dropped ${out.filter(o => o.verdict === 'DROP').length}; held off-blueprint ${out.filter(o => o.verdict === 'HOLD').length}`)
console.log(`easy cap ${cap}: inserted easy ${easy.slice(0, cap).map(o => o.id).join(',') || '-'}; held by cap ${heldEasy.length} ${heldEasy.join(',')}`)
console.log(`KEPT ${keptIds.size}`)
if (process.argv.includes('--write')) {
  const byId = Object.fromEntries(frozen.map(i => [i.id, i])); const v = Object.fromEntries(out.map(o => [o.id, o]))
  const kept = frozen.filter(i => keptIds.has(i.id)).map(i => ({ ...i, difficulty: v[i.id].diff }))
  writeFileSync(`${D}/sat-math-v26-algfull.kept.batch.json`, JSON.stringify(kept, null, 1) + '\n')
  writeFileSync(`${D}/sat-math-v26-algfull.held.batch.json`, JSON.stringify(frozen.filter(i => v[i.id].verdict === 'HOLD' || heldEasy.includes(i.id)).map(i => ({ ...i, _held: v[i.id].verdict === 'HOLD' ? 'off-blueprint by majority' : 'panel-median easy past the easy cap (live Algebra mix)', _panel_difficulty: v[i.id].diff })), null, 1) + '\n')
  writeFileSync(`${D}/sat-math-v26-algfull.dropped.json`, JSON.stringify(out.filter(o => o.verdict === 'DROP'), null, 1) + '\n')
  const qc = {}; for (const i of kept) { const gs = Object.values(G[i.id]); qc[i.id] = { difficulty: v[i.id].diff, key_votes: gs.filter(r => r.key_ok !== false).length, n_struck_median: med(gs.map(r => Number(r.n_struck ?? 0))) } }
  writeFileSync(`${D}/malgf26.qc.json`, JSON.stringify(qc, null, 1) + '\n')
  console.log('written: kept, held, dropped, qc')
}
