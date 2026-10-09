#!/usr/bin/env node
/**
 * wic18-probe.mjs — pre-freeze STEERING probes for sat-cs-wic-v18 (decide nothing at the gate).
 *
 *   render <round>        options-only render of every author file on disk + six v17
 *                         calibration items (A-04 A-06 B-03 B-04 B-05 B-06, each with a
 *                         key-antonym pair), keys dealt flat, interleaved, ids P01..
 *                         -> sat-cs-wic-v18-probe-<round>.blind.json / .key.json
 *   score <round>         reads sat-cs-wic-v18-probe-<round>.probe.json
 *   render-diff           passages + options, no key -> sat-cs-wic-v18-dprobe.blind.json / .key.json
 *   score-diff            reads sat-cs-wic-v18-dprobe.probe.json
 *
 * Score bars (PREREG-WIC18): each forced pick (test_word, antonym_pole, odd_one_out,
 * most_specific) hits the key on < 35% of an author's items; the probe is a reader
 * only if it names an opposite pair on >= 4 of 6 calibration items.
 * Refuses (exit 2) on missing/unreadable input or an id mismatch.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { rng, shuffleWith } from './seeded-shuffle.mjs'
const D = 'scripts/study-bank', W = `${D}/sat-cs-wic-v18-work`
const L4 = ['A', 'B', 'C', 'D']
const [cmd, round] = process.argv.slice(2)
const rd = p => { if (!existsSync(p)) { console.error(`REFUSING: ${p} missing`); process.exit(2) } try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { console.error(`REFUSING: ${p}: ${e.message}`); process.exit(2) } }
const cands = () => {
  const out = []
  for (const a of L4) { const dir = `${W}/${a}`; if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter(f => /^WIC18[A-D]-\d\d\.json$/.test(f)).sort()) out.push({ ...rd(`${dir}/${f}`), author: a }) }
  if (!out.length) { console.error('REFUSING: no candidate files'); process.exit(2) }
  return out
}
const CAL = ['WIC17A-04', 'WIC17A-06', 'WIC17B-03', 'WIC17B-04', 'WIC17B-05', 'WIC17B-06']
const deal = (list, seed, withPassage) => {
  const rand = rng(seed)
  const shuffled = shuffleWith(list, rand).map((x, i) => ({ ...x, want: L4[i % 4] }))
  const order = shuffleWith(shuffled, rand)
  const blind = {}, key = {}
  order.forEach((x, i) => {
    const pid = `P${String(i + 1).padStart(2, '0')}`
    const rest = shuffleWith(x.choices.filter(c => c !== x.correct_answer), rand)
    let q = 0; const opts = Object.fromEntries(L4.map(l => [l, l === x.want ? x.correct_answer : rest[q++]]))
    blind[pid] = withPassage ? { passage: x.passage, prompt: x.prompt, options: opts } : { options: opts }
    key[pid] = { letter: x.want, id: x.id, author: x.author, calibration: !!x.calibration, difficulty: x.difficulty }
  })
  return { blind, key }
}
const pct = (a, b) => b ? `${(100 * a / b).toFixed(1)}%` : 'n/a'
if (cmd === 'render') {
  if (!round) { console.error('usage: render <round>'); process.exit(2) }
  const v17 = rd(`${D}/sat-wic-hard-v17.batch.json`).filter(it => CAL.includes(it.id)).map(it => ({ ...it, author: 'CAL', calibration: true }))
  if (v17.length !== 6) { console.error('REFUSING: calibration items missing'); process.exit(2) }
  const c = cands()
  const { blind, key } = deal([...c, ...v17], round === 'r1' ? 20261181 : 20261182, false)
  writeFileSync(`${D}/sat-cs-wic-v18-probe-${round}.blind.json`, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(`${D}/sat-cs-wic-v18-probe-${round}.key.json`, JSON.stringify(key, null, 1) + '\n')
  console.log(`probe ${round}: ${c.length} candidates + 6 calibration = ${Object.keys(blind).length}`)
} else if (cmd === 'score') {
  const key = rd(`${D}/sat-cs-wic-v18-probe-${round}.key.json`), pr0 = rd(`${D}/sat-cs-wic-v18-probe-${round}.probe.json`)
  const pr = pr0.items ?? pr0
  const ids = Object.keys(key)
  const miss = ids.filter(i => !pr[i]); if (miss.length) { console.error(`REFUSING: probe missing ${miss.length} ids (${miss.slice(0, 5).join(',')})`); process.exit(2) }
  const H = ['test_word', 'antonym_pole', 'odd_one_out', 'most_specific']
  const blind = rd(`${D}/sat-cs-wic-v18-probe-${round}.blind.json`)
  const named = new Map(); const add = (id, why) => { if (!named.has(id)) named.set(id, []); named.get(id).push(why) }
  for (const a of L4) {
    const its = ids.filter(i => key[i].author === a); if (!its.length) continue
    const line = H.map(h => { const hits = its.filter(i => String(pr[i][h] ?? '').toUpperCase() === key[i].letter); const over = hits.length / its.length >= 0.35; if (over) hits.forEach(i => add(key[i].id, `${h} hits key`)); return `${h} ${hits.length}/${its.length}${over ? ' OVER' : ''}` })
    console.log(`author ${a} (${its.length}): ${line.join('  ')}`)
  }
  for (const i of ids) {
    if (key[i].calibration) continue
    const op = (pr[i].opposite_pairs ?? []).filter(p => Array.isArray(p) && p.length === 2)
    if (op.length) add(key[i].id, `opposite pair ${op.map(p => p.join('/')).join(', ')}`)
    const ac = pr[i].above_ceiling ?? []; if (ac.length) add(key[i].id, `above ceiling ${ac.join(', ')}`)
    if (pr[i].polarity_breach) add(key[i].id, 'polarity breach')
  }
  const cal = ids.filter(i => key[i].calibration)
  const calHit = cal.filter(i => (pr[i].opposite_pairs ?? []).length > 0)
  console.log(`calibration: opposite pair named on ${calHit.length}/6 (${calHit.map(i => key[i].id).join(', ')}) -> ${calHit.length >= 4 ? 'probe IS a reader' : 'NOT a reader: run a second probe'}`)
  const candIds = ids.filter(i => !key[i].calibration)
  const ap = candIds.filter(i => String(pr[i].antonym_pole ?? '').toUpperCase() === key[i].letter).length
  const tw = candIds.filter(i => String(pr[i].test_word ?? '').toUpperCase() === key[i].letter).length
  console.log(`candidates ${candIds.length}: test_word on key ${tw} (${pct(tw, candIds.length)}), antonym_pole on key ${ap} (${pct(ap, candIds.length)})`)
  console.log(`named for revision: ${named.size}`)
  for (const [id, w] of [...named].sort()) console.log(`  ${id}: ${w.join('; ')}`)
  writeFileSync(`${D}/sat-cs-wic-v18-probe-${round}.named.json`, JSON.stringify(Object.fromEntries(named), null, 1) + '\n')
} else if (cmd === 'render-diff') {
  const { blind, key } = deal(cands(), 20261183, true)
  writeFileSync(`${D}/sat-cs-wic-v18-dprobe.blind.json`, JSON.stringify(blind, null, 1) + '\n')
  writeFileSync(`${D}/sat-cs-wic-v18-dprobe.key.json`, JSON.stringify(key, null, 1) + '\n')
  console.log(`difficulty probe: ${Object.keys(blind).length} items`)
} else if (cmd === 'score-diff') {
  const key = rd(`${D}/sat-cs-wic-v18-dprobe.key.json`), pr0 = rd(`${D}/sat-cs-wic-v18-dprobe.probe.json`)
  const pr = pr0.items ?? pr0
  const ids = Object.keys(key)
  const miss = ids.filter(i => !pr[i]); if (miss.length) { console.error(`REFUSING: probe missing ${miss.length} ids`); process.exit(2) }
  const hist = {}, named = {}
  for (const i of ids) {
    const r = pr[i], k = key[i]; const why = []
    hist[`${k.difficulty}->${r.difficulty}`] = (hist[`${k.difficulty}->${r.difficulty}`] ?? 0) + 1
    if (String(r.pick ?? '').toUpperCase() !== k.letter) why.push(`cold miss (${r.pick})`)
    if (k.difficulty === 'hard' && r.difficulty === 'easy') why.push('authored hard, probe easy')
    if (k.difficulty === 'hard' && r.key_from_one_sentence === true) why.push('key from one sentence')
    if ((Number(r.explicit_kills) || 0) >= 2) why.push(`${r.explicit_kills} explicit kills`)
    if (why.length) named[k.id] = why
  }
  console.log(`difficulty probe ${ids.length}: ${JSON.stringify(hist)}`)
  for (const [id, w] of Object.entries(named).sort()) console.log(`  ${id}: ${w.join('; ')}`)
  console.log(`named: ${Object.keys(named).length}`)
  writeFileSync(`${D}/sat-cs-wic-v18-dprobe.named.json`, JSON.stringify(named, null, 1) + '\n')
} else { console.error('usage: wic18-probe.mjs render <r> | score <r> | render-diff | score-diff'); process.exit(2) }
