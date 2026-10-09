// With-source render for announcement-v6 G3 (key unmarked, choices seeded-shuffled).
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const items = JSON.parse(readFileSync(new URL('../announcement-v6.batch.json', import.meta.url)))
const rnd = s => { let h = parseInt(createHash('md5').update(s).digest('hex').slice(0, 8), 16); return () => (h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32 }
const shuf = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const deck = shuf(Array.from({ length: items.length }, (_, i) => 'ABCD'[i % 4]), rnd('ann6-ws:deck'))
let md = '# announcement-v6 with-source render (key unmarked)\n', q = 0, set = 0
const key = {}, groups = [...new Set(items.map(i => i.passageGroupId))]
for (const g of groups) {
  const its = items.filter(i => i.passageGroupId === g)
  md += `\n## Announcement ${++set}\n\n${its[0].passage}\n`
  for (const it of its) {
    // key slot dealt flat from a deck; distractors shuffled around it
    const others = shuf(it.choices.filter(c => c !== it.correct_answer), rnd('ann6-ws:' + it.id))
    const slot = 'ABCD'.indexOf(deck[q]); const ch = [...others]; ch.splice(slot, 0, it.correct_answer)
    q++; key[q] = { letter: 'ABCD'[ch.indexOf(it.correct_answer)], localId: it.id, group: g }
    md += `\n**Question ${q}.** ${it.prompt.replace(/^\[[^\]]*\]\s*/, '')}\n\n` + ch.map((c, i) => `${'ABCD'[i]}. ${c}`).join('\n') + '\n'
  }
}
writeFileSync(new URL('./grade/ann6-ws.md', import.meta.url), md)
writeFileSync(new URL('./grade/ann6-ws.key.json', import.meta.url), JSON.stringify(key, null, 1))
const cnt = {}; for (const v of Object.values(key)) cnt[v.letter] = (cnt[v.letter] ?? 0) + 1
console.log('questions', q, 'sets', set, 'key letters', cnt)
