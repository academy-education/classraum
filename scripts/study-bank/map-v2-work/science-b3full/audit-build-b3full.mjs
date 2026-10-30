#!/usr/bin/env node
/**
 * audit-build-b3full.mjs: stage 2 of MAP-SCIENCE-B3-FULL.prereg.md, the key-visible second audit over the stage-1
 * survivors. Same instrument as the 2026-10-30 science audit (SCIENCE-AUDIT-2026-10-30.prereg.md): the brief
 * SCIENCE-AUDIT-BRIEF.md, figures decoded by act-sci-packet decodeGraphic, auditor a plain and auditor b adversarial,
 * same prompts; scored unchanged by `science-audit-score.mjs <root>`. The only difference: these items are not in
 * the bank yet (stage 2 precedes staging), so the population is read from the author's items.json and the survivor
 * list in STAGE1-DECISION.json (written by score-b3full.mjs --recheck), one packet per area.
 *
 *   node audit-build-b3full.mjs [--root <repo>] [--out <dir>]   (default scratchpad/map-science-b3full/audit)
 *
 * Refuses (exit 2) when STAGE1-DECISION.json has no applied re-check results, a survivor is missing from items.json,
 * an item lacks 4 choices containing its key, or a figure cannot be decoded.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { decodeGraphic, normalizeDisplayText } from '../../act-science-regrade/act-sci-packet.mjs'

const args = process.argv.slice(2)
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const ROOT = path.resolve(flag('--root', process.cwd()))
const SP = path.join(ROOT, 'scratchpad/map-science-b3full')
const OUT = path.resolve(flag('--out', path.join(SP, 'audit')))
const die = (m) => { console.error('REFUSED: ' + m); process.exit(2) }
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const put = (p, b) => fs.writeFileSync(p, typeof b === 'string' ? b : JSON.stringify(b, null, 1) + '\n')
export const COHORT_OF = { life: 'map-science-v3-life', phys: 'map-science-v3-phys', earth: 'map-science-v3-earth' }
const LETTER = { life: 'L', phys: 'P', earth: 'E' }
const SLOTS = ['A', 'B', 'C', 'D']

const dec = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/study-bank/map-v2-work/science-b3full/STAGE1-DECISION.json'), 'utf8'))
if (fs.existsSync(path.join(OUT, 'MANIFEST.json'))) fs.rmSync(OUT, { recursive: true })
fs.mkdirSync(OUT, { recursive: true })
const briefPath = path.join(OUT, 'AUDIT-BRIEF.md')
const manifest = { built_at: new Date().toISOString(), prereg: 'scripts/study-bank/MAP-SCIENCE-B3-FULL.prereg.md (stage 2), instrument SCIENCE-AUDIT-2026-10-30.prereg.md', brief: briefPath, items: 0, passages: 0, packets: [] }

for (const area of ['life', 'phys', 'earth']) {
  const d = dec.areas[area]
  if (!d || !Array.isArray(d.recheck_results)) die(`${area}: STAGE1-DECISION.json has no applied re-check (run score-b3full.mjs --recheck first)`)
  if (d.survivor_ids.length !== d.survivors) die(`${area}: survivor list ${d.survivor_ids.length} != ${d.survivors}`)
  const items = JSON.parse(fs.readFileSync(path.join(SP, `${LETTER[area]}/items.json`), 'utf8'))
  const byId = new Map(items.map((x) => [x.id, x]))
  const name = `${COHORT_OF[area]}--p1`, dir = path.join(OUT, name)
  fs.mkdirSync(dir, { recursive: true })
  const L = [`# Science audit packet ${name}`, '', `Read ${briefPath} first. Keys and explanations are shown on purpose.`,
    'Each MAP item is standalone: its stimulus and figure are printed with it.', '']
  const index = { packet: name, cohort: COHORT_OF[area], family: 'map', items: [] }
  for (const id of d.survivor_ids) {
    const it = byId.get(id); if (!it) die(`${id} not in items.json`)
    const ch = it.choices ?? []
    if (ch.length !== 4 || !ch.includes(it.correct_answer)) die(`${id}: needs 4 choices containing its key`)
    let f
    try { f = decodeGraphic(it.graphic ?? null) } catch (e) { die(`${id}: figure not decodable: ${e.message}`) }
    L.push(`## PASSAGE ${id}  (${COHORT_OF[area]})`, '', normalizeDisplayText(it.passage ?? '') || '(no passage text)', '', f.text, '')
    for (const w of f.warnings) L.push(`RENDER WARNING: ${w}`)
    if (f.warnings.length) L.push('')
    L.push(`### ${id}  (${it.map_area})`, '', `QUESTION: ${normalizeDisplayText(it.prompt)}`, ...ch.map((o, i) => `  ${SLOTS[i]}) ${o}`), '',
      `KEY: ${SLOTS[ch.indexOf(it.correct_answer)]}) ${it.correct_answer}`, `AUTHOR'S EXPLANATION: ${normalizeDisplayText(it.explanation ?? '') || '(none)'}`)
    if (it.distractor_rationales) L.push(`AUTHOR'S DISTRACTOR NOTES: ${JSON.stringify(it.distractor_rationales)}`)
    L.push('')
    index.items.push({ id, cohort: COHORT_OF[area], passage: id, row_id: null })
  }
  const text = L.join('\n') + '\n'
  put(path.join(dir, 'packet.md'), text); put(path.join(dir, 'index.json'), index)
  manifest.items += index.items.length; manifest.passages += index.items.length
  manifest.packets.push({ packet: name, cohort: COHORT_OF[area], passages: index.items.length, items: index.items.length, packet_sha256: sha(text), auditors: ['a', 'b'].map((k) => ({
    id: k, mode: k === 'a' ? 'plain' : 'adversarial', output: path.join(dir, `audit-${k}.json`),
    prompt: `You are science auditor ${k} for packet ${name}. Read ${briefPath} and then ${path.join(dir, 'packet.md')}, and nothing else in the repo. `
      + (k === 'b' ? 'ASSUME every passage in this packet contains at least one error - a wrong key, a second defensible option, a value the key needs that cannot be read off the figure as rendered, a false fact or a self-contradiction, or an item answerable without the passage - and hunt for it; argue against each key before accepting it. Flag only what you can show. ' : '')
      + `Write ${path.join(dir, `audit-${k}.json`)} exactly in the brief's shape, one entry for each of the ${index.items.length} item ids in the packet. Claude only, no database, no other files, write only your own file.`,
  })) })
  console.log(`${name}: ${index.items.length} items`)
}
put(briefPath, fs.readFileSync(path.join(ROOT, 'scripts/study-bank/SCIENCE-AUDIT-BRIEF.md'), 'utf8'))
put(path.join(OUT, 'NOT-AUDITABLE.json'), [])
put(path.join(OUT, 'MANIFEST.json'), manifest)
console.log(`built ${manifest.packets.length} packets, ${manifest.items} items under ${path.relative(ROOT, OUT)}`)
