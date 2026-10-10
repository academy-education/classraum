import { readFileSync as r, writeFileSync as w } from 'node:fs'
const J = p => JSON.parse(r(p, 'utf8')), S = (p, o) => w(p, JSON.stringify(o, null, 1) + '\n')
const A = 'r0', B = 'r0b-p04'
// licensing: key entries for P04 from B; labels for P04 v3/v4 from B
const k0 = J(`${A}/lic/lic-key.json`), k1 = J(`${B}/lic/lic-key.json`)
for (const [id, v] of Object.entries(k1)) k0[id] = v
S(`${A}/lic/lic-key.json`, k0)
for (const k of [3, 4]) for (const t of ['a', 'b']) {
  const a = J(`${A}/lic/lic-v${k}.${t}.json`), b = J(`${B}/jobs/lic-v${k}${t}/lic-v${k}.${t}.json`)
  const la = a.labels ?? a; for (const [q, v] of Object.entries(b.labels ?? b)) la[q] = v
  S(`${A}/lic/lic-v${k}.${t}.json`, { labels: la }); S(`${B}/lic/lic-v${k}.${t}.json`, b)
}
// A1: P04 key + labels from B
const a1k = J(`${A}/a1/a1-key.json`), b1k = J(`${B}/a1/a1-key.json`)
for (const id of Object.keys(a1k)) if (id.startsWith('WV12-P04.')) delete a1k[id]
Object.assign(a1k, b1k); S(`${A}/a1/a1-key.json`, a1k)
for (const t of ['a', 'b']) { const a = J(`${A}/a1/a1-judge.${t}.json`), b = J(`${B}/jobs/a1${t}/a1-judge.${t}.json`); const la = a.labels ?? a
  for (const id of Object.keys(la)) if (id.startsWith('WV12-P04.')) delete la[id]
  Object.assign(la, b.labels ?? b); S(`${A}/a1/a1-judge.${t}.json`, la); S(`${B}/a1/a1-judge.${t}.json`, b) }
console.log('merged')
