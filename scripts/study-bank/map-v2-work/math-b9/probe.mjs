// read-only duplicate probe for candidates.json: every query through mf30-kw over dump-b6 (3,986 live ISEE/SSAT/SAT/ACT
// rows + 2,517 prior MAP/maths rows), plus a regex over earlier-N-chains.json (431: every earlier MAP Number Systems
// item + batch-7 and batch-8 items, mechanisms and dropped drafts). Prints compact hits.
// Refuses (exit 2) if mf30-kw fails, if its header does not report the full dump, or if the earlier list is short.
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const R = '/Users/andylee/Downloads/saas/classraum/', W = R + 'scripts/study-bank/map-v2-work/math-b9/'
const C = JSON.parse(readFileSync(W + 'candidates.json', 'utf8')), E = JSON.parse(readFileSync(W + 'earlier-N-chains.json', 'utf8'))
if (E.length !== 431) { console.error(`REFUSING: earlier list has ${E.length} entries, expected 431`); process.exit(2) }
const only = process.argv[2]?.split(',')
const out = {}
let queries = 0
for (const c of C) {
  if (only && !only.includes(c.id)) continue
  const hits = []
  for (const q of c.q) {
    const r = spawnSync('node', [R + 'scripts/study-bank/mf30-kw.mjs', R + 'scratchpad/map-v2-math-work/dump-b6', q, '--full'], { encoding: 'utf8', maxBuffer: 1 << 26 })
    if (r.status !== 0) { console.error(`${c.id}: mf30-kw exit ${r.status} on "${q}": ${r.stderr}`); process.exit(2) }
    const hm = r.stdout.match(/^query ".*": (\d+) hits over (\d+) live \+ (\d+) prior/m)
    if (!hm || +hm[2] !== 3986 || +hm[3] !== 2517) { console.error(`${c.id}: mf30-kw header unreadable or dump size changed on "${q}": ${r.stdout.slice(0, 200)}`); process.exit(2) }
    queries++
    const blocks = r.stdout.split('\n--- ').slice(1)
    if (blocks.length !== +hm[1]) { console.error(`${c.id}: parsed ${blocks.length} hit blocks, header says ${hm[1]}`); process.exit(2) }
    for (const b of blocks) { const [head, ...rest] = b.split('\n'); hits.push({ q, head: head.slice(0, 90), text: rest.join(' ').replace(/\s+/g, ' ').slice(0, 300) }) }
  }
  const re = new RegExp(c.e, 'i')
  const eh = E.filter(x => re.test(x.chain + ' ' + x.prompt)).map(x => ({ id: x.id, st: x.status, g: x.grade, chain: String(x.chain).slice(0, 160), prompt: String(x.prompt).slice(0, 160) }))
  out[c.id] = { live_prior: hits, earlier: eh }
  const uniq = [...new Map(hits.map(h => [h.head, h])).values()]
  console.log(`\n=== ${c.id} g${c.g} ${c.ask.slice(0, 100)}\n  kw hits ${uniq.length}; earlier-N regex hits ${eh.length}`)
  for (const h of uniq.slice(0, 8)) console.log(`   - ${h.head} :: ${h.text.slice(0, 260)}`)
  for (const h of eh.slice(0, 6)) console.log(`   * ${h.id} [${h.st}] ${h.chain}`)
}
console.error(`queries run: ${queries}`)
writeFileSync(W + 'probe-out' + (only ? '-' + only.join('_') : '') + '.json', JSON.stringify(out, null, 1))
