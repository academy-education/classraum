#!/usr/bin/env node
/**
 * wic6-aggregate.mjs — turn three INDEPENDENT with-source grades into the
 * qc.json that accepts.mjs reads, and apply the pre-registered drop rule.
 *
 * WHY THREE WITH-SOURCE GRADERS AND NOT THE BLIND SOLVERS. `accepts.mjs`
 * gates on `key_votes >= 2`. The three blind solvers had NO passage — their
 * picks measure what the option set leaks and are not votes on the key.
 * Writing key_votes: 3 from them would fabricate the field the acceptance
 * rule leans on hardest. So the key votes come from three graders who each
 * solved the item from the passage before reading its explanation.
 *
 * MAJORITY, NOT ANY-ONE, ON EXCLUSIVITY. The pre-registered rule says drop if
 * a second option survives a defensible reading. With one grader that is a
 * verdict; with three it needs a rule fixed in advance of the third arriving,
 * or "how many graders does it take" gets decided by which answer it yields.
 * The rule used here: a MAJORITY (2 of 3) must call an item non-exclusive to
 * drop it, and a single dissent is recorded on the item rather than banked.
 * That mirrors accepts.mjs's own 2-of-3 key rule and is stricter nowhere and
 * looser nowhere than the existing standard.
 *
 * Difficulty and distractor quality are likewise majority votes. An item with
 * no majority difficulty takes the WORSE of the two tied grades, because a
 * batch that cannot be graded consistently is not a hard batch.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const D = 'scripts/study-bank'
const FILES = { a: `${D}/wic6.ws.json`, d: `${D}/wic6.ws-d.json`, e: `${D}/wic6.ws-e.json` }
const missing = Object.entries(FILES).filter(([, p]) => !existsSync(p)).map(([n]) => n)
if (missing.length) { console.error(`REFUSING: grader file(s) missing: ${missing.join(', ')}. A partial run is not a run.`); process.exit(2) }
const G = Object.fromEntries(Object.entries(FILES).map(([n, p]) => [n, JSON.parse(readFileSync(p, 'utf8'))]))

const ids = Object.keys(G.a).sort()
for (const [n, g] of Object.entries(G)) {
  const k = Object.keys(g).sort()
  if (k.length !== ids.length || k.some((x, i) => x !== ids[i])) {
    console.error(`REFUSING: grader ${n} covers ${k.length} ids, not the same ${ids.length} as grader a.`); process.exit(2)
  }
}
const mode = xs => {
  const c = {}; for (const x of xs) c[x] = (c[x] ?? 0) + 1
  const best = Math.max(...Object.values(c))
  const win = Object.keys(c).filter(k => c[k] === best)
  return { win, best, c }
}
const RANK = { easy: 0, medium: 1, hard: 2 }
const QRANK = { weak: 0, plausible: 1, strong: 2 }

/* Blind half: solved 3/3 with a mechanism named 3/3. From score-wic.mjs. */
const BLIND_DROP = new Set(['WIC6-06'])
/* Condition 6, from the graders' confirmed free eliminations (not declared ones). */
const FREE_ELIM = { 'WIC6-02': 1, 'WIC6-04': 1, 'WIC6-05': 1, 'WIC6-08': 1, 'WIC6-09': 0, 'WIC6-11': 2 }

const qc = {}, verdict = {}
for (const id of ids) {
  const rows = Object.values(G).map(g => g[id])
  const key_votes = rows.filter(r => r.key_ok === true).length
  const nonExcl = rows.filter(r => r.exclusive === false)
  const noPassage = rows.filter(r => r.passage_needed === false)
  const dm = mode(rows.map(r => r.difficulty))
  const difficulty = dm.win.length === 1 ? dm.win[0] : dm.win.sort((x, y) => RANK[x] - RANK[y])[0]
  const qm = mode(rows.map(r => r.distractor_quality))
  const distractor_quality = qm.win.length === 1 ? qm.win[0] : qm.win.sort((x, y) => QRANK[x] - QRANK[y])[0]
  qc[id] = { key_votes, difficulty, distractor_quality, passage_needed: noPassage.length < 2 }

  const why = []
  if (BLIND_DROP.has(id)) why.push('1: solved 3/3 blind with mechanism 3/3')
  if (key_votes < 2) why.push(`2: key_votes ${key_votes}/3`)
  if (nonExcl.length >= 2) why.push(`3: ${nonExcl.length}/3 call it non-exclusive (${[...new Set(nonExcl.map(r => r.second_defensible))].join(' / ')})`)
  if (distractor_quality === 'weak') why.push('4: distractors weak by majority')
  if (noPassage.length >= 2) why.push(`5: ${noPassage.length}/3 say the passage is not needed`)
  if ((FREE_ELIM[id] ?? 0) >= 2) why.push(`6: ${FREE_ELIM[id]} of 3 distractors free-strikable`)
  const dissent = []
  if (nonExcl.length === 1) dissent.push(`one grader disputes exclusivity (${nonExcl[0].second_defensible})`)
  if (noPassage.length === 1) dissent.push('one grader says the passage is not needed')
  verdict[id] = { why, dissent, difficulty, distractor_quality, key_votes }
}
for (const id of ids) {
  const v = verdict[id]
  console.log(`${v.why.length ? 'DROP' : 'KEEP'}  ${id}  keys ${v.key_votes}/3  ${v.difficulty.padEnd(6)} ${v.distractor_quality.padEnd(9)} ${v.why.join(' | ')}${v.why.length ? '' : (v.dissent.length ? '   [' + v.dissent.join('; ') + ']' : '')}`)
}
const keep = ids.filter(id => !verdict[id].why.length)
console.log(`\nsurvivors ${keep.length} of ${ids.length}: ${keep.join(', ')}`)
const dh = mode(keep.map(id => verdict[id].difficulty)).c
console.log(`survivor difficulty: ${JSON.stringify(dh)}`)
writeFileSync(`${D}/wic6.qc.json`, JSON.stringify(Object.fromEntries(keep.map(id => [id, qc[id]])), null, 1))
console.log(`wrote ${D}/wic6.qc.json with the ${keep.length} survivors`)
