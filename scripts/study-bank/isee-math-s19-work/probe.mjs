// probe.mjs <ideas-file> [--full]: for each idea line "ID :: kw query :: idea text", runs the mandated live keyword
// probe (../mf30-kw.mjs over ./dump, every family, live + prior) and a TF-IDF nearest-live check over the same dump
// (catches reworded twins the regex misses). Writes probes/<ideas>.json. Exits 2 if mf30-kw refuses or a line is malformed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const D = new URL('.', import.meta.url).pathname
const f = process.argv[2]; const full = process.argv.includes('--full')
const lines = readFileSync(f, 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))
const live = JSON.parse(readFileSync(D + 'dump/live-maths.json', 'utf8'))
if (live.length < 4000) { console.error('REFUSING: live dump ' + live.length); process.exit(2) }
const tok = s => (String(s).toLowerCase().match(/[a-z]{3,}|\d+(?:\.\d+)?/g) || []).filter(w => !STOP.has(w))
const STOP = new Set('the and what that this with from which each are for how many value has have its than then their there these they was were will one two three four five six what of number numbers'.split(' '))
const df = new Map(); const docs = live.map(r => { const t = tok(r.prompt + ' ' + (r.passage || '')); const tf = new Map(); t.forEach(w => tf.set(w, (tf.get(w) || 0) + 1)); for (const w of tf.keys()) df.set(w, (df.get(w) || 0) + 1); return tf })
const idf = w => Math.log(live.length / (1 + (df.get(w) || 0)))
const vec = tf => { const v = new Map(); let n = 0; for (const [w, c] of tf) { const x = c * idf(w); v.set(w, x); n += x * x } return [v, Math.sqrt(n) || 1] }
const LV = docs.map(vec)
const out = []
mkdirSync(D + 'probes', { recursive: true })
for (const ln of lines) {
  const parts = ln.split(' :: ').map(s => s.trim()); if (parts.length < 3) { console.error('REFUSING: malformed line ' + ln); process.exit(2) }
  const [id, q, idea] = parts
  const r = spawnSync('node', [D + '../mf30-kw.mjs', D + 'dump', q], { encoding: 'utf8' })
  if (r.status) { console.error('REFUSING: mf30-kw ' + r.stderr); process.exit(2) }
  const L = r.stdout.split('\n'); const n = +(L[0].match(/: (\d+) hits/) || [])[1]
  if (!Number.isFinite(n)) { console.error('REFUSING: unparsed mf30-kw header ' + L[0]); process.exit(2) }
  const hits = []; for (let i = 1; i < L.length; i++) if (L[i].startsWith('---')) hits.push((L[i].replace(/^--- /, '') + ' :: ' + (L[i + 1] || '')).replace(/\s+/g, ' '))
  const tf = new Map(); tok(idea).forEach(w => tf.set(w, (tf.get(w) || 0) + 1)); const [qv, qn] = vec(tf)
  const sc = LV.map(([v, n], i) => { let s = 0; for (const [w, x] of qv) if (v.has(w)) s += x * v.get(w); return [s / (n * qn), i] }).sort((a, b) => b[0] - a[0]).slice(0, 2)
  const nn = sc.map(([s, i]) => `${s.toFixed(2)} ${live[i].id.slice(0, 8)} ${live[i].family}: ${live[i].prompt.replace(/\s+/g, ' ').slice(0, full ? 400 : 110)}`)
  out.push({ id, q, idea, kw_hits: n, kw: hits, tfidf: nn })
  console.log(`${id} kw=${n} | ${idea.slice(0, 70)}`)
  for (const h of hits.slice(0, full ? 8 : 2)) console.log('   kw ' + h.slice(0, full ? 500 : 130))
  console.log('   nn ' + nn[0].slice(0, full ? 500 : 140))
}
writeFileSync(D + 'probes/' + f.replace(/^.*\//, '') + '.json', JSON.stringify(out, null, 1))
