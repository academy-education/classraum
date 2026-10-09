// announcement-v5 G0 shape pre-flight (PREREG-ANNOUNCEMENT-V5-2026-10-09.md).
// usage: node ann5-preflight.mjs <AN5-XX.json | batch.json ...>   |   --selftest
// Exits 1 on any FAIL, 2 if it cannot read a non-empty input.
import { readFileSync } from 'node:fs'

const LIVE = JSON.parse(readFileSync(new URL('./ann-live.json', import.meta.url)))
const COMM = JSON.parse(readFileSync(new URL('./ann5/COMMISSION.json', import.meta.url)))
const words = s => s.split(/\s+/).filter(Boolean).length
const toks = s => new Set(s.toLowerCase().replace(/^transcript:\s*/, '').match(/[a-z']+/g) ?? [])
const jac = (a, b) => { let i = 0; for (const t of a) if (b.has(t)) i++; return i / (a.size + b.size - i) }
const NAME = /\b[A-Z][a-z]+(?:[- ][A-Z][a-z]+)+\b/g

function loadItems(paths) {
  const items = []
  for (const p of paths) {
    const j = JSON.parse(readFileSync(p, 'utf8'))
    items.push(...(Array.isArray(j) ? j : j.items))
  }
  return items
}

export function check(items) {
  const fails = []
  const f = (id, m) => fails.push(`${id}: ${m}`)
  const sets = new Map()
  for (const it of items) { if (!sets.has(it.passageGroupId)) sets.set(it.passageGroupId, []); sets.get(it.passageGroupId).push(it) }
  let longest = 0, shortest = 0
  for (const [gid, s] of sets) {
    if (s.length !== 2) f(gid, `set has ${s.length} questions, want 2`)
    if (new Set(s.map(x => x.passage)).size !== 1) f(gid, 'passage not identical within set')
    const p = s[0].passage ?? ''
    if (!p.startsWith('Transcript: ')) f(gid, 'passage does not start "Transcript: "')
    const w = words(p.replace(/^Transcript:\s*/, ''))
    if (w < 90 || w > 170) f(gid, `passage ${w} words, want 90-170`)
    const pt = toks(p)
    for (const l of LIVE) { const j = jac(pt, toks(l.passage ?? '')); if (j >= 0.5) f(gid, `Jaccard ${j.toFixed(2)} vs live ${l.id}`) }
    for (const [g2, s2] of sets) if (g2 > gid) { const j = jac(pt, toks(s2[0].passage ?? '')); if (j >= 0.5) f(gid, `Jaccard ${j.toFixed(2)} vs ${g2}`) }
    const comm = COMM.find(c => c.set === gid)
    s.forEach((it, k) => {
      const id = it.id ?? `${gid}#${k}`
      if (it.listeningTask !== 'announcement') f(id, 'listeningTask')
      if (!/^\[Announcement — [^\]]+\] \S/.test(it.prompt ?? '')) f(id, 'prompt tag')
      const ch = it.choices ?? []
      if (ch.length !== 4 || new Set(ch.map(c => c.trim())).size !== 4) f(id, 'need 4 distinct choices')
      if (!ch.includes(it.correct_answer)) f(id, 'key not verbatim in choices')
      if (/\b(option|choice|answer) ?[ABCD]\b|\b\(?[ABCD]\)\s|\b(first|second|third|fourth|last) (option|choice)/i.test(it.explanation ?? '')) f(id, 'explanation names an option by position')
      const lens = ch.map(c => c.length), kl = it.correct_answer?.length ?? 0
      if (kl === Math.max(...lens) && lens.filter(x => x === kl).length === 1) longest++
      if (kl === Math.min(...lens) && lens.filter(x => x === kl).length === 1) shortest++
      if (Math.max(...lens) / Math.min(...lens) > 1.4) f(id, `option length ratio ${(Math.max(...lens) / Math.min(...lens)).toFixed(2)} > 1.4`)
      const want = comm?.[k === 0 ? 'q1' : 'q2']?.keyLengthRank
      const rank = 1 + lens.filter(x => x < kl).length
      if (want && rank !== want) f(id, `key length rank ${rank}, commissioned ${want}`)
    })
  }
  const n = items.length
  if (longest / n > 0.35) fails.push(`BATCH: key uniquely longest ${longest}/${n}`)
  if (shortest / n > 0.35) fails.push(`BATCH: key uniquely shortest ${shortest}/${n}`)
  // person names reused across sets
  const where = new Map()
  for (const [gid, s] of sets) for (const m of new Set((s[0].passage ?? '').match(NAME) ?? [])) { if (!where.has(m)) where.set(m, new Set()); where.get(m).add(gid) }
  for (const [m, g] of where) if (g.size > 1 && !/^(Transcript|Good|Hello|Thank)/.test(m)) fails.push(`BATCH: "${m}" appears in ${[...g].join(', ')}`)
  return { fails, sets: sets.size, n, longest, shortest }
}

function selftest() {
  const ok = { id: 'AN5-99-1', passageGroupId: 'AN5-99', listeningTask: 'announcement', passage: 'Transcript: ' + 'word '.repeat(100), prompt: '[Announcement — x] What?', choices: ['aaaa', 'bbbbb', 'ccccc', 'dddd'], correct_answer: 'bbbbb', explanation: 'quoted' }
  const ok2 = { ...ok, id: 'AN5-99-2', choices: ['eeee', 'fffff', 'ggggg', 'hhhh'], correct_answer: 'eeee' }
  const base = check([ok, ok2]).fails.filter(x => !x.startsWith('BATCH'))
  const plants = [
    [{ ...ok, passage: 'Transcript: short' }, ok2, 'words'],
    [{ ...ok, correct_answer: 'zzz' }, ok2, 'verbatim'],
    [{ ...ok, explanation: 'option B is right' }, ok2, 'position'],
    [{ ...ok, choices: ['a', 'bbbbb', 'ccccc', 'dddd'] }, ok2, 'ratio'],
    [{ ...ok, prompt: 'What?' }, ok2, 'tag'],
    [ok, { ...ok2, passage: ok.passage + ' extra' }, 'identical'],
  ]
  let bad = 0
  if (base.length) { console.log('selftest: clean pair flagged', base); bad++ }
  for (const [a, b, want] of plants) { const r = check([a, b]).fails.join(' | '); if (!r.includes(want === 'words' ? 'words' : want === 'verbatim' ? 'verbatim' : want === 'position' ? 'position' : want === 'ratio' ? 'ratio' : want === 'tag' ? 'tag' : 'identical')) { console.log('selftest: plant not caught', want); bad++ } }
  console.log(bad ? `selftest FAILED (${bad})` : 'selftest clean (6 plants caught, clean pair passes)')
  process.exit(bad ? 1 : 0)
}

if (process.argv.includes('--selftest')) selftest()
const paths = process.argv.slice(2)
if (!paths.length) { console.error('usage: ann5-preflight.mjs <files...>'); process.exit(2) }
const items = loadItems(paths)
if (!items.length) { console.error('REFUSING: 0 items read'); process.exit(2) }
const r = check(items)
console.log(`read ${r.n} items in ${r.sets} sets from ${paths.length} file(s); live passages compared: ${LIVE.length}`)
console.log(`key uniquely longest ${r.longest}/${r.n}, uniquely shortest ${r.shortest}/${r.n}`)
for (const x of r.fails) console.log('FAIL', x)
console.log(r.fails.length ? `${r.fails.length} FAIL(s)` : 'G0 clean')
process.exit(r.fails.length ? 1 : 0)
