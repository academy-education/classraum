#!/usr/bin/env node
/**
 * build.mjs — inputs for the map-v2 Math Number Systems gate batch n11 (MAP-MATH-V2-N11.prereg.md), 2026-10-30.
 * The 7 stage-A candidates picked in scratchpad/map-v2-math-b11-work/SELECTION.md, taken unchanged from
 * candidates.json (21 of 21 PART OK there), re-issued as MB11-N<g>-NN. Writes, from files already on disk
 * (no DB, no model):
 *   1. map-v2-work/math-n11/slots.json   one cell per grade (N5 N6 N7 N8); each row copied from the stage-A
 *      slots.json with only `id` re-issued and `selected_from` added
 *   2. scratchpad/map-v2-math-n11-work/<cell>/items.json   the author files: each candidate verbatim, `id`
 *      re-issued, `selected_from` = the candidate id (real files, not symlinks: the id changes)
 *   3. scratchpad/map-v2-math-work/dump-n11/prior-math.json   dump-b10 (2,537 rows: dump-b6 + the b6/b7/b8 rows,
 *      incl. the b7/b8 first-written versions n789 had to drop) + every n789 item (as screened, revised/frozen,
 *      withdrawn) + every b10 item (as screened, revised/frozen, withdrawn). No MB11C candidate (selected or not)
 *      is added: the 14 unselected siblings are near-duplicates of the 7 by construction and math-check's prior
 *      scan does not skip them.
 *   3b. scratchpad/map-v2-math-work/dump-n11-check/prior-math.json   the math-check prior: dump-n11 minus every
 *      version of the 7 candidates' own predecessors (frozen_from); predecessors.json records the map
 *   4. map-v2-work/math-n11/EXCLUSIONS-map-n11.txt   every earlier MAP maths item in dump-n11 (the b6 format)
 * Refuses (exit 2) on any count it does not expect.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
const ROOT = '/Users/andylee/Downloads/saas/classraum', D = ROOT + '/scripts/study-bank/', SP = ROOT + '/scratchpad/'
const STAGE_A = SP + 'map-v2-math-b11-work/'
const die = m => { console.error('REFUSING: ' + m); process.exit(2) }
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const rd = p => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { die(`unreadable ${p}: ${e.message}`) } }

// SELECTION.md order within each grade cell
const PICK = [
  ['N5', 'MB11-N5-01', 'MB11C-F04-c'],
  ['N6', 'MB11-N6-01', 'MB11C-F08-b'],
  ['N6', 'MB11-N6-02', 'MB11C-E06-a'],
  ['N7', 'MB11-N7-01', 'MB11C-D33-a'],
  ['N7', 'MB11-N7-02', 'MB11C-E12-a'],
  ['N7', 'MB11-N7-03', 'MB11C-E16-b'],
  ['N8', 'MB11-N8-01', 'MB11C-F11-c'],
]
const sel = readFileSync(STAGE_A + 'SELECTION.md', 'utf8')
const named = [...sel.matchAll(/\|\s*(F11|D33|F08|F04|E12|E16|E06)\s*\|\s*(MB11C-[A-Z0-9]+-[abc])\s*\|/g)].map(m => m[2])
if (named.length !== 7 || PICK.some(p => !named.includes(p[2]))) die(`SELECTION.md names ${named.join(' ')}; build picks ${PICK.map(p => p[2]).join(' ')}`)

const cands = rd(STAGE_A + 'candidates.json'), aslots = rd(STAGE_A + 'slots.json')
if (cands.length !== 21) die(`candidates.json holds ${cands.length}, expected 21`)
const arow = Object.fromEntries(Object.values(aslots).flatMap(v => v.rows.map(r => [r.id, { ...r, area: v.area }])))
const slots = {}, cells = {}
for (const [cell, id, from] of PICK) {
  const c = cands.find(x => x.id === from) ?? die(`candidates.json has no ${from}`)
  const r = arow[from] ?? die(`stage-A slots.json has no row ${from}`)
  if (r.g !== +cell.slice(1) || c.grade_target !== r.g) die(`${from}: grade ${c.grade_target} / slot g${r.g} is not cell ${cell}`)
  if (c.key_rank !== r.rank) die(`${from}: key_rank ${c.key_rank} != slot rank ${r.rank}`)
  slots[cell] ??= { area: r.area, scope: '', rows: [] }
  const { area, ...row } = r
  slots[cell].rows.push({ ...row, id, selected_from: from })
  ;(cells[cell] ??= []).push({ ...c, id, selected_from: from })
}
for (const [cell, v] of Object.entries(slots)) v.scope = [...new Set(v.rows.map(r => r.ccss_hint))].join(' / ')
const AUTH = SP + 'map-v2-math-n11-work'
for (const [cell, items] of Object.entries(cells)) {
  mkdirSync(`${AUTH}/${cell}`, { recursive: true })
  writeFileSync(`${AUTH}/${cell}/items.json`, JSON.stringify(items, null, 1) + '\n')
  console.log(`${cell}  ${items.map(i => `${i.id} <- ${i.selected_from}`).join(', ')}  sha256 ${sha(`${AUTH}/${cell}/items.json`).slice(0, 16)}`)
}
mkdirSync(D + 'map-v2-work/math-n11', { recursive: true })
writeFileSync(D + 'map-v2-work/math-n11/slots.json', JSON.stringify(slots, null, 1) + '\n')

// duplicate / R11 corpus
const prior = rd(SP + 'map-v2-math-work/dump-b10/prior-math.json')
if (prior.length !== 2537) die(`dump-b10 ${prior.length} rows, expected 2537`)
const row = (x, file) => ({ id: x.id, prompt: x.prompt, choices: x.choices, correct_answer: x.correct_answer, domain: x.domain, file })
const add = []
for (const [b, nAll, nPost, wantFrozen] of [['n789', 9, 7, 7], ['b10', 15, 10, 10]]) {
  const w = `${SP}map-math-v2-${b}-work/`
  const a = rd(w + 'assembled.json'), p = rd(w + 'assembled.post-return.json')
  const drops = rd(`${D}map-math-v2-${b}/stage0-drops.json`)
  if (a.length !== nAll || p.length !== nPost || Object.keys(drops).length !== nAll - nPost) die(`${b}: assembled ${a.length} / post-return ${p.length} / withdrawn ${Object.keys(drops).length}, expected ${nAll}/${nPost}/${nAll - nPost}`)
  const frozen = new Set((b === 'n789' ? ['num'] : ['oa', 'geo', 'data']).flatMap(k => rd(`${D}map-math-v2-${b}/${k}/batch.json`).map(i => i.id)))
  if (frozen.size !== wantFrozen) die(`${b}: frozen ${frozen.size}, expected ${wantFrozen}`)
  for (const x of a) add.push(row(x, `map-math-v2 ${b} ${drops[x.id] ? 'withdrawn' : 'as screened (pass 1)'}`))
  for (const x of p) add.push(row(x, `map-math-v2 ${b} ${frozen.has(x.id) ? 'frozen (held on options-only)' : 'revised'}`))
}
const key = x => `${x.id}|${x.prompt}|${x.correct_answer}|${JSON.stringify(x.choices)}`
const have = new Set(prior.map(key)), extra = []
for (const x of add) { const k = key(x); if (!have.has(k)) { have.add(k); extra.push(x) } }
const out = [...prior, ...extra]
if (out.some(x => /^MB11/.test(String(x.id)))) die('dump-n11 holds an MB11 row')
const n789ids = ['MB7-N7-01', 'MB8-N6-01', 'MB8-N7-01', 'MB8-N7-02', 'MB8-N7-03', 'MB8-N7-05', 'MB9-N5-01', 'MB9-N6-01', 'MB9-N8-01']
if (!n789ids.every(id => out.some(x => x.id === id && /map-math/.test(x.file)))) die('dump-n11 is missing an n789 item')
mkdirSync(SP + 'map-v2-math-work/dump-n11', { recursive: true })
writeFileSync(SP + 'map-v2-math-work/dump-n11/prior-math.json', JSON.stringify(out))
// math-check prior: dump-n11 minus every version of each candidate's OWN predecessor (its `frozen_from`, the held n789
// item of the same slot). math-check's prior scan cannot tell a re-authoring from a template (j 0.81-1.00 on all 7),
// exactly as n789 had to drop its candidates' own first-written rows. The R11 earlier set (dump-n11) keeps them.
const pred = PICK.map(([, id, from]) => [id, cands.find(x => x.id === from).frozen_from])
if (pred.some(([, f]) => !n789ids.includes(f)) || new Set(pred.map(p => p[1])).size !== 7) die(`frozen_from must name 7 distinct n789 items: ${pred.map(p => p.join('<-')).join(' ')}`)
const predIds = new Set(pred.map(p => p[1]))
const chk = out.filter(x => !predIds.has(String(x.id)))
mkdirSync(SP + 'map-v2-math-work/dump-n11-check', { recursive: true })
writeFileSync(SP + 'map-v2-math-work/dump-n11-check/prior-math.json', JSON.stringify(chk))
writeFileSync(D + 'map-v2-work/math-n11/predecessors.json', JSON.stringify(Object.fromEntries(pred), null, 1) + '\n')
console.log(`dump-n11-check (math-check prior): ${chk.length} rows = dump-n11 ${out.length} - ${out.length - chk.length} rows of the 7 predecessors (${[...predIds].join(' ')}); sha256 ${sha(SP + 'map-v2-math-work/dump-n11-check/prior-math.json')}`)
const map = out.filter(x => /map-math|DB map/.test(x.file ?? ''))
const ids = [...new Set(map.map(x => String(x.id)))]
const seen = new Set(), lines = []
for (const x of map) { const k = x.id + '|' + x.file + '|' + x.prompt; if (seen.has(k)) continue; seen.add(k); lines.push(`(${x.id}) | ${x.file}${predIds.has(String(x.id)) ? ` [held predecessor of ${pred.find(p => p[1] === String(x.id))[0]}]` : ''} | ${String(x.prompt ?? '').replace(/\s+/g, ' ')} | key ${x.correct_answer}`) }
writeFileSync(`${D}map-v2-work/math-n11/EXCLUSIONS-map-n11.txt`, `# EXCLUSIONS for the map-v2 Math Number Systems gate batch n11 (seven MB11 items, stage-A selection).\n# Every earlier MAP maths item (live, staged, dropped, withdrawn, first-written, as screened, revised, frozen and held)\n# from dump-n11/prior-math.json (dump-b10 + every n789 item + every b10 item).\n# R11: a candidate that repeats the chain of steps of any item below is a template and is dropped.\n# id | source | prompt | key\n\n${lines.join('\n')}\n`)
console.log(`dump-n11: ${out.length} rows (dump-b10 ${prior.length} + ${extra.length} n789/b10 rows); MAP maths rows ${map.length}, distinct ids ${ids.length}; sha256 ${sha(SP + 'map-v2-math-work/dump-n11/prior-math.json')}`)
const rows = Object.values(slots).flatMap(v => v.rows)
console.log(`slots: ${Object.keys(slots).length} cells, ${rows.length} rows; key ranks 1/2/3/4 = ${[1, 2, 3, 4].map(r => rows.filter(x => x.rank === r).length).join('/')}`)
console.log(`EXCLUSIONS-map-n11.txt: ${lines.length} lines, ${ids.length} ids`)
