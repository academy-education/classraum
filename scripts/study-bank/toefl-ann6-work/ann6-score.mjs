// announcement-v6 G1 + G2 scorer (PREREG-ANNOUNCEMENT-V6-2026-10-09.md).
//   node ann6-score.mjs <dir> <tag> [<tag> ...]
// For each tag reads <dir>/<tag>.key.json and <dir>/<tag>.solver-{a,b,c}.json.
// G1: candidate mean over all picks, control = best-fixed-letter rate per file
//     (pooled over files), margin = mean - control.
// G2 (conv-hard-v2's rule): a DISTRACTOR certain-rejected by >= 2 of the 3
//     samples drops its whole set. Key certain-rejects are counted, never drop.
// Exits 2 if any input is missing/unreadable or a solver file lacks an item:
// a check that cannot read its input must not return a number.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SAMPLES = ['a', 'b', 'c']
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const read = p => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`cannot read ${p}: ${e.message}`) } }

export function score(dir, tags) {
  let picks = 0, right = 0, ctrlHits = 0, n = 0
  const perItem = [], dropSets = new Map(), keyRejects = [], unan = { n: 0, right: 0 }
  for (const tag of tags) {
    const key = read(join(dir, `${tag}.key.json`))
    const ids = Object.keys(key)
    if (!ids.length) die(`${tag}.key.json has 0 items`)
    const sols = SAMPLES.map(s => read(join(dir, `${tag}.solver-${s}.json`)))
    const letters = { A: 0, B: 0, C: 0, D: 0 }
    for (const id of ids) letters[key[id].letter]++
    ctrlHits += Math.max(...Object.values(letters)); n += ids.length
    for (const id of ids) {
      const k = key[id]
      const rows = sols.map((s, i) => {
        const r = s[id]
        if (!r || !/^[ABCD]$/.test(r.pick ?? '')) die(`${tag}.solver-${SAMPLES[i]} has no valid pick for item ${id}`)
        if (r.certain_reject != null && !Array.isArray(r.certain_reject)) die(`${tag}.solver-${SAMPLES[i]} item ${id} certain_reject is not a list`)
        return r
      })
      const ok = rows.filter(r => r.pick === k.letter).length
      picks += 3; right += ok
      if (new Set(rows.map(r => r.pick)).size === 1) { unan.n++; if (ok === 3) unan.right++ }
      const rej = { A: 0, B: 0, C: 0, D: 0 }
      for (const r of rows) for (const L of new Set(r.certain_reject ?? [])) if (rej[L] !== undefined) rej[L]++
      const distractorHits = Object.entries(rej).filter(([L, c]) => L !== k.letter && c >= 2).map(([L, c]) => `${L}x${c}`)
      if (rej[k.letter] > 0) keyRejects.push(`${k.localId} (key ${k.letter} by ${rej[k.letter]})`)
      if (distractorHits.length) {
        if (!dropSets.has(k.group)) dropSets.set(k.group, [])
        dropSets.get(k.group).push(`${k.localId} ${distractorHits.join(',')}`)
      }
      perItem.push({ tag, id, localId: k.localId, group: k.group, solved: ok, rej })
    }
  }
  const mean = 100 * right / picks, control = 100 * ctrlHits / n
  return { n, picks, right, mean, control, margin: mean - control, unan, dropSets, keyRejects, perItem }
}

const f1 = x => x.toFixed(1)
if (process.argv[1]?.endsWith('ann6-score.mjs')) {
  const [dir, ...tags] = process.argv.slice(2)
  if (!dir || !tags.length) die('usage: ann6-score.mjs <dir> <tag...>')
  const r = score(dir, tags)
  console.log(`items ${r.n} (${tags.join(', ')}); picks ${r.right}/${r.picks} = ${f1(r.mean)}%; best-fixed-letter control ${f1(r.control)}%; margin ${r.margin >= 0 ? '+' : ''}${f1(r.margin)}`)
  console.log(`unanimous ${r.unan.n}/${r.n} = ${f1(100 * r.unan.n / r.n)}% (of which solved ${r.unan.right})`)
  console.log(`solved 3/3: ${r.perItem.filter(x => x.solved === 3).map(x => x.localId).sort().join(', ') || 'none'}`)
  console.log(`G2 distractor certain-reject >= 2 of 3 -> drop set: ${r.dropSets.size} set(s)`)
  for (const [g, why] of [...r.dropSets].sort()) console.log(`  DROP ${g}: ${why.join('; ')}`)
  console.log(`key certain-rejects (reported, not a drop): ${r.keyRejects.length} item(s)${r.keyRejects.length ? ': ' + r.keyRejects.sort().join(', ') : ''}`)
}
