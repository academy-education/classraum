import { readFileSync } from 'node:fs'
const items = JSON.parse(readFileSync('items.json', 'utf8'))
const n = s => String(s || '').toLowerCase().split('|').map(x => x.trim().replace(/\s+/g, ' ')).join(' | ')
const sol = ['sa', 'sb', 'sc'].map(w => { try { return JSON.parse(readFileSync(`${w}/answers.json`, 'utf8')) } catch (e) { console.error(`REFUSING: ${w}/answers.json unreadable`); process.exit(2) } })
for (const [i, s] of sol.entries()) { const miss = items.filter(it => !s[it.id]?.order); if (miss.length) { console.error(`REFUSING: solver ${'abc'[i]} missing ${miss.length} ids`); process.exit(2) } }
let pass = 0; const fails = [], alts = []
for (const it of items) {
  const key = n(it.correct_answer)
  const hits = sol.filter(s => n(s[it.id].order) === key).length
  if (hits >= 2) pass++; else fails.push(`${it.id} ${hits}/3 :: ${sol.map(s => n(s[it.id].order)).filter(o => o !== key).join(' || ')}`)
  sol.forEach((s, i) => {
    const o = n(s[it.id].order); if (o !== key) alts.push({ id: it.id, from: `solver-${'abc'[i]}-order`, alt: o })
    if (s[it.id].other_valid_order) alts.push({ id: it.id, from: `solver-${'abc'[i]}-other`, alt: n(s[it.id].other_valid_order) })
  })
}
console.log(`convergence: ${pass}/${items.length} items with >= 2/3 exact; fails ${fails.length}`); fails.forEach(f => console.log('  ' + f))
console.log(`candidate alternatives for the hunt/adjudication: ${alts.length}`); alts.forEach(a => console.log(`  ${a.id} [${a.from}] ${a.alt}`))
