// read-only duplicate probe for candidates.json: every query through mf30-kw over dump-b6 (3,986 live ISEE/SSAT/SAT/ACT
// rows + 2,517 prior MAP/maths rows), plus a regex over earlier-N-chains.json (chain + prompt). Prints compact hits.
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const R = '/Users/andylee/Downloads/saas/classraum/', W = R + 'scripts/study-bank/map-v2-work/math-b7/'
const C = JSON.parse(readFileSync(W + 'candidates.json', 'utf8')), E = JSON.parse(readFileSync(W + 'earlier-N-chains.json', 'utf8'))
const only = process.argv[2]?.split(',')
const out = {}
for (const c of C) {
  if (only && !only.includes(c.id)) continue
  const hits = []
  for (const q of c.q) {
    const r = spawnSync('node', [R + 'scripts/study-bank/mf30-kw.mjs', R + 'scratchpad/map-v2-math-work/dump-b6', q, '--full'], { encoding: 'utf8', maxBuffer: 1 << 26 })
    if (r.status !== 0) { console.error(`${c.id}: mf30-kw exit ${r.status} on "${q}": ${r.stderr}`); process.exit(2) }
    const blocks = r.stdout.split('\n--- ').slice(1)
    for (const b of blocks) { const [head, ...rest] = b.split('\n'); hits.push({ q, head: head.slice(0, 90), text: rest.join(' ').replace(/\s+/g, ' ').slice(0, 230) }) }
  }
  const re = new RegExp(c.e, 'i')
  const eh = E.filter(x => re.test(x.chain + ' ' + x.prompt)).map(x => ({ id: x.id, st: x.status, g: x.grade, chain: String(x.chain).slice(0, 140) }))
  out[c.id] = { live_prior: hits, earlier: eh }
  const uniq = [...new Map(hits.map(h => [h.head, h])).values()]
  console.log(`\n=== ${c.id} g${c.g} ${c.ask.slice(0, 90)}\n  kw hits ${uniq.length}; earlier-N regex hits ${eh.length}`)
  for (const h of uniq.slice(0, 6)) console.log(`   - ${h.head} :: ${h.text.slice(0, 200)}`)
  for (const h of eh.slice(0, 4)) console.log(`   * ${h.id} [${h.st}] ${h.chain}`)
}
writeFileSync(W + 'probe-out' + (only ? '-' + only.join('_') : '') + '.json', JSON.stringify(out, null, 1))
