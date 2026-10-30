#!/usr/bin/env node
/**
 * audit.mjs — design-spec + distribution audit for map-v2 Reading batch 3 (MRV4) passage sets.
 *
 *   node scripts/study-bank/map-v2-work/reading-b3/audit.mjs <authored.json> [more.json ...]
 *
 * Why: MRV3's repair round traded one template tell for another (central-idea: one narrow detail + two
 * overclaims; theme: "usually"/"tends to" only in distractors; purpose: "prove"/"argue" only in distractors;
 * within-passage key echoes). Batch 3 fixes the option design in assignments.json BEFORE writing, per item:
 * distractor FAMILIES (theme N/R/O/X/W, central-idea N/R/O/B/M), the key's marker class and the distractors'
 * marker classes (H hedge, A absolute, S prescriptive, 0 none), and purpose lead verbs. This script checks each
 * item against its spec and prints the batch distribution tables (key rate vs distractor rate).
 *
 * Exits 2 on input it cannot read (or zero items), 1 on any violation, 0 only when "audit violations: 0".
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const files = process.argv.slice(2).filter(a => !a.startsWith('--'))
const FULL = process.argv.includes('--full')
if (!files.length) die('usage: audit.mjs <authored.json> [...]')
const sets = files.flatMap(f => {
  if (!existsSync(f)) die(`missing ${f}`)
  let a; try { a = JSON.parse(readFileSync(f, 'utf8')) } catch (e) { die(`${f}: ${e.message}`) }
  if (!Array.isArray(a)) die(`${f}: not an array of passage sets`)
  return a
})
const nItems = sets.reduce((n, s) => n + (Array.isArray(s.items) ? s.items.length : 0), 0)
if (!sets.length || !nItems) die('zero passage sets / items read')
const A = JSON.parse(readFileSync(join(HERE, 'assignments.json'), 'utf8'))
const spec = Object.fromEntries(A.passages.map(p => [p.passage_id, p]))

const norm = s => String(s ?? '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
const RX = {
  H: /\b(can|could|may|might|sometimes|often|usually|tends? to|tended to|some|many|frequently|generally|occasionally|perhaps|likely)\b/i,
  A: /\b(always|never|every|everyone|everything|everybody|only|all|any|anyone|anything|nothing|no one|none|nobody|completely|entirely|totally|forever)\b/i,
  S: /\b(should|must|ought|need to|needs to|have to|has to)\b/i,
}
const classes = s => ['H', 'A', 'S'].filter(c => RX[c].test(norm(s)))
const cls = s => { const c = classes(s); return c.length === 0 ? '0' : c.length === 1 ? c[0] : 'MIXED:' + c.join('') }
const WORDS = ['CAUSAL', 'usually', 'tends? to', 'can', 'often', 'sometimes', 'may', 'some', 'should', 'must', 'always', 'never', 'only', 'every', 'all', 'because', 'since', 'so', 'mainly', 'mostly', 'prove', 'argue', 'show', 'explain']
const VERBS = ['show', 'explain', 'suggest', 'emphasize', 'contrast', 'introduce', 'argue', 'prove', 'reveal', 'describe', 'create', 'compare', 'build', 'set up', 'highlight', 'illustrate']
const leadVerb = s => {
  const t = norm(s).toLowerCase()
  let best = null
  for (const v of VERBS) { const m = t.match(new RegExp(`\\b${v}(s|es|ed|ing|d)?\\b`)); if (m && (best === null || m.index < best.i)) best = { v, i: m.index } }
  return best?.v ?? null
}
const stems = s => new Set((norm(s).toLowerCase().match(/[a-z]{5,}/g) ?? []).map(w => w.slice(0, 5)))
const ov = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n }
const NOSPEC = process.argv.includes('--nospec') // tables + generic rules only (to break-test on an older batch)
const V = []
const v = m => V.push(m)

// tables
const T = {} // kind -> { key: {cls counts}, dis: {...}, words: {w: [k, d]}, fam: {}, n }
const tab = k => (T[k] ??= { n: 0, key: {}, dis: {}, words: Object.fromEntries(WORDS.map(w => [w, [0, 0]])), fam: {}, longest: 0, shortest: 0, verbs: {} })
const inc = (o, k) => { o[k] = (o[k] || 0) + 1 }

for (const s of sets) {
  const sp = NOSPEC ? { kinds: (s.items ?? []).map(i => i.kind), spec: { kind: null } } : spec[s.passage_id]
  if (!sp) { v(`${s.passage_id}: not in assignments.json`); continue }
  const items = s.items ?? []
  const kinds = items.map(i => i.kind)
  if (!NOSPEC && JSON.stringify([...kinds].sort()) !== JSON.stringify([...sp.kinds].sort())) v(`${s.passage_id}: kinds ${kinds.join(',')} but spec ${sp.kinds.join(',')}`)
  for (const it of items) {
    const q = it.qid, ch = it.choices ?? [], key = it.correct_answer
    if (!Array.isArray(ch) || ch.length !== 4 || !ch.includes(key)) { v(`${q}: needs 4 choices including the key`); continue }
    const dis = ch.filter(c => c !== key)
    const t = tab(it.kind); t.n++
    const kc = cls(key), dc = dis.map(cls)
    inc(t.key, kc); dc.forEach(c => inc(t.dis, c))
    for (const w of WORDS) { const r = w === 'CAUSAL' ? /\b(because|since|so|therefore|which is why|thanks to|due to)\b/i : new RegExp(`\\b${w}\\b`, 'i'); if (r.test(norm(key))) t.words[w][0]++; for (const d of dis) if (r.test(norm(d))) t.words[w][1]++ }
    const L = ch.map(c => norm(c).length), kl = norm(key).length
    if (kl === Math.max(...L) && L.filter(x => x === kl).length === 1) t.longest++
    if (kl === Math.min(...L) && L.filter(x => x === kl).length === 1) t.shortest++
    // generic rule: the key's marker class must not be unique in its item
    if (!dc.includes(kc)) v(`${q} (${it.kind}): key marker class ${kc} appears in no distractor (${dc.join('/')}) — drop-by-hedge tell`)
    if (kc.startsWith('MIXED') || dc.some(c => c.startsWith('MIXED'))) v(`${q}: an option mixes marker classes (${[kc, ...dc].join(' / ')}); give each option one class`)
    // spec'd items
    if (it.kind === sp.spec.kind) {
      const fam = (it.distractor_rationales ?? []).map(d => d.family)
      fam.forEach(f => inc(t.fam, f ?? 'missing'))
      if (JSON.stringify([...fam].sort()) !== JSON.stringify([...sp.spec.distractor_families].sort())) v(`${q}: distractor families ${fam.join(',')} but spec ${sp.spec.distractor_families.join(',')}`)
      const [kcls, kword] = sp.spec.key_marker.split(':')
      if (kc !== kcls) v(`${q}: key marker class ${kc}, spec ${kcls}`)
      if (kword && !new RegExp(`\\b${kword}\\b`, 'i').test(norm(key))) v(`${q}: key must use "${kword}"`)
      const want = sp.spec.distractor_markers.map(x => x.split(':')[0]).sort()
      if (JSON.stringify([...dc].sort()) !== JSON.stringify(want)) v(`${q}: distractor marker classes ${dc.join('/')} but spec ${want.join('/')}`)
      for (const x of sp.spec.distractor_markers) { const [c, w] = x.split(':'); if (w && !dis.some(d => cls(d) === c && new RegExp(`\\b${w}\\b`, 'i').test(norm(d)))) v(`${q}: spec wants a distractor of class ${c} using "${w}"`) }
    }
    if (it.kind === 'purpose' && !NOSPEC) {
      const kv = leadVerb(key), dv = dis.map(leadVerb)
      inc(t.verbs, 'KEY:' + kv); dv.forEach(x => inc(t.verbs, 'DIS:' + x))
      if (kv !== sp.purpose_key_verb) v(`${q}: purpose key lead verb ${kv}, spec ${sp.purpose_key_verb}`)
      if (JSON.stringify([...dv].sort()) !== JSON.stringify([...(sp.purpose_distractor_verbs ?? [])].sort())) v(`${q}: purpose distractor lead verbs ${dv.join(',')} but spec ${(sp.purpose_distractor_verbs ?? []).join(',')}`)
    }
  }
  // within-passage key echo: key_i shares more content stems with key_j than any of item i's distractors does
  for (const a of items) for (const b of items) {
    if (a === b || !a.choices || !b.choices) continue
    const kb = stems(b.correct_answer), ka = stems(a.correct_answer)
    const o = ov(ka, kb), od = Math.max(...a.choices.filter(c => c !== a.correct_answer).map(d => ov(stems(d), kb)))
    if (o >= 2 && o > od) v(`${a.qid} key echoes ${b.qid} key (${o} shared stems vs ${od} for its best distractor)`)
  }
}
// cross-passage: theme / central-idea keys too alike
const top = sets.flatMap(s => (s.items ?? []).filter(i => i.kind === 'theme' || i.kind === 'central-idea').map(i => ({ q: i.qid, k: stems(i.correct_answer) })))
for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) { const o = ov(top[i].k, top[j].k); if (o >= 3) v(`${top[i].q} / ${top[j].q}: keys share ${o} content stems (identical key prose?)`) }

const pct = (a, b) => b ? (100 * a / b).toFixed(0) + '%' : '-'
console.log(`passage sets: ${sets.length}; items: ${nItems}`)
for (const [k, t] of Object.entries(T).sort()) {
  const nd = 3 * t.n
  console.log(`\n== ${k} (n=${t.n} keys, ${nd} distractors)`)
  const C = [...new Set([...Object.keys(t.key), ...Object.keys(t.dis)])].sort()
  console.log('  marker class   keys          distractors')
  for (const c of C) console.log(`  ${c.padEnd(13)}  ${String(t.key[c] || 0).padStart(2)}/${t.n} ${pct(t.key[c] || 0, t.n).padStart(4)}   ${String(t.dis[c] || 0).padStart(2)}/${nd} ${pct(t.dis[c] || 0, nd).padStart(4)}`)
  const ws = WORDS.filter(w => t.words[w][0] + t.words[w][1] > 0).map(w => `${w.replace('s? to', 's to')} ${t.words[w][0]}k/${t.words[w][1]}d`)
  if (ws.length) console.log('  words (keys/distractors): ' + ws.join(', '))
  if (Object.keys(t.fam).length) console.log('  distractor families: ' + Object.entries(t.fam).sort().map(([f, n]) => `${f} ${n}`).join(', '))
  if (Object.keys(t.verbs).length) console.log('  purpose lead verbs: ' + Object.entries(t.verbs).sort().map(([f, n]) => `${f} ${n}`).join(', '))
  console.log(`  key uniquely longest ${t.longest}/${t.n}, uniquely shortest ${t.shortest}/${t.n}`)
  // batch parity per word with enough mass (only meaningful on the full batch)
  for (const w of WORDS) { const [a, b] = t.words[w]; if (t.n >= 8 && (a + b >= 3 || (a === 0 && b >= 2))) { const share = a / (a + b); if (share < 0.1 || share > 0.45) { const m = `${k}: "${w}" key share ${(100 * share).toFixed(0)}% (${a}k/${b}d; flat = 25%)`; console.log('  parity: ' + m); if (FULL) v('parity ' + m) } } }
}
console.log(`\naudit violations: ${V.length}`); V.forEach(x => console.log('  ' + x))
process.exit(V.length ? 1 : 0)
