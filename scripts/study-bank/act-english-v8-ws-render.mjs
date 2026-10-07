// With-source render for act-english-v8 (the act-english-v7 renderer, recovered
// verbatim from the v7 session): passages + items, key UNMARKED,
// non-"No Change" options shuffled by a seeded deal (No Change stays first, as
// students see it). Writes <out>.ws.md (grader input) and <out>.ws.key.json.
//   node ws-render.mjs <out-prefix> <batch.json...>
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const [out, ...files] = process.argv.slice(2)
const items = files.flatMap(f => JSON.parse(readFileSync(f, 'utf8')))
if (!items.length) { console.error('REFUSING: zero items'); process.exit(2) }
const rnd = s => { let h = parseInt(createHash('md5').update(s).digest('hex').slice(0, 8), 16); return () => (h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32 }
const groups = {}
for (const it of items) (groups[it.passage_id] ??= []).push(it)
let md = '', n = 0
const key = {}
for (const [pid, g] of Object.entries(groups)) {
  md += `\n\n=====================================================\nPASSAGE ${pid}: ${g[0].passage_title ?? ''}\n=====================================================\n\n${g[0].passage}\n\n--- Questions on passage ${pid} ---\n`
  for (const it of g) {
    n++
    const r = rnd(out + ':' + it.id)
    const nc = it.choices.filter(c => /^no change$/i.test(c.trim()))
    const rest = it.choices.filter(c => !/^no change$/i.test(c.trim()))
    const isPlace = rest.every(c => /^Point \[[A-D]\]/.test(c))
    if (!isPlace) for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]] }
    const opts = [...nc, ...rest]
    const L = 'ABCD'
    md += `\nQ${n}. [${it.domain}] ${it.prompt}\n` + opts.map((c, i) => `   ${L[i]}) ${c}`).join('\n') + '\n'
    key[String(n)] = { letter: L[opts.indexOf(it.correct_answer)], localId: it.id, domain: it.domain, subskill: it.subskill, passage: pid }
  }
}
writeFileSync(`${out}.ws.md`, md.trimStart())
writeFileSync(`${out}.ws.key.json`, JSON.stringify(key, null, 2))
const spread = {}; for (const k of Object.values(key)) spread[k.letter] = (spread[k.letter] ?? 0) + 1
console.log(`${out}: ${n} items in ${Object.keys(groups).length} passages; key letters ${JSON.stringify(spread)}`)
