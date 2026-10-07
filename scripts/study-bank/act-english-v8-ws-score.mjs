// Apply pre-registered bar 4 (v7 bar 3) to three with-source samples. The act-english-v7
// scorer, recovered verbatim from the v7 session.
//   node ws-score.mjs <prefix>      reads <prefix>.ws.key.json and <prefix>.grader-{a,b,c}.json
// Grader JSON shape: {"1":{"pick":"B","second_defensible":null|"C","no_source_needed":false,"single_sentence":true,"difficulty":"medium","note":"..."}}
import { readFileSync, existsSync } from 'node:fs'
const [prefix] = process.argv.slice(2)
const key = JSON.parse(readFileSync(`${prefix}.ws.key.json`, 'utf8'))
const S = ['a', 'b', 'c']
const missing = S.filter(s => !existsSync(`${prefix}.grader-${s}.json`))
if (missing.length) { console.error(`REFUSING: missing grader sample(s) ${missing.join(',')} — bar 3 needs three`); process.exit(2) }
const g = S.map(s => JSON.parse(readFileSync(`${prefix}.grader-${s}.json`, 'utf8')))
const NEEDS_ESSAY = /transition|placement|add|delete|purpose|introduc|conclu|goal|detail|connect|emphasi|illustrat/i
const drops = []
let agree = 0, total = 0
const diff = { easy: 0, medium: 0, hard: 0 }
for (const [id, k] of Object.entries(key)) {
  total++
  const picks = g.map(x => x[id])
  if (picks.some(p => !p || !p.pick)) { console.error(`REFUSING: item ${id} lacks a pick in some sample`); process.exit(2) }
  const why = []
  const wrong = picks.map((p, i) => p.pick !== k.letter ? `${S[i]}:${p.pick}` : null).filter(Boolean)
  if (wrong.length) why.push(`pick != key ${k.letter} (${wrong.join(' ')})`)
  else agree++
  const sd = {}; for (const p of picks) if (p.second_defensible && p.second_defensible !== k.letter) sd[p.second_defensible] = (sd[p.second_defensible] ?? 0) + 1
  for (const [L, c] of Object.entries(sd)) if (c >= 2) why.push(`second defensible ${L} named by ${c}`)
  if (k.domain === 'Production of Writing' && NEEDS_ESSAY.test(k.subskill ?? '')) {
    const ns = picks.filter(p => p.no_source_needed === true).length
    if (ns >= 2) why.push(`no_source_needed by ${ns}`)
  }
  const ds = picks.map(p => p.difficulty).filter(Boolean).sort()
  if (ds.length) { const med = ds[1] ?? ds[0]; if (med in diff) diff[med]++ }
  const ss = picks.filter(p => p.single_sentence === true).length
  if (why.length) drops.push({ id, localId: k.localId, passage: k.passage, domain: k.domain, subskill: k.subskill, why: why.join('; '), notes: picks.map((p, i) => `${S[i]}: ${p.note ?? ''}`).join(' | ') })
  k._ss = ss
}
console.log(`${prefix}: scorable ${total} of ${Object.keys(key).length}; all-three-agree-with-key ${agree}/${total}`)
console.log(`median difficulty: ${JSON.stringify(diff)}`)
const ssByDom = {}
for (const k of Object.values(key)) { const d = (ssByDom[k.domain] ??= { n: 0, ss: 0 }); d.n++; if (k._ss >= 2) d.ss++ }
console.log('single-sentence-retrievable (>=2 samples) by domain:', JSON.stringify(ssByDom))
console.log(`\nDROPS under bar 3: ${drops.length}`)
for (const d of drops) console.log(`  ${d.localId} [${d.domain} / ${d.subskill}] ${d.why}\n      ${d.notes.slice(0, 600)}`)
const byPassage = {}; for (const d of drops) byPassage[d.passage] = (byPassage[d.passage] ?? 0) + 1
console.log('\npassages with drops:', JSON.stringify(byPassage))
