#!/usr/bin/env node
/**
 * verbal-audit-build.mjs — builds the verbal key-visible audit packets (VERBAL-AUDIT-2026-10-31.prereg.md).
 * Read-only against the bank.
 *
 *   node scripts/study-bank/verbal-audit-build.mjs [--root <dir>] [--run <audit run id>] [--expect <n>] [--force]
 *     --root    default <repo>/scratchpad/verbal-audit
 *     --run     default agentreview-audit-cofounder-2026-10-29
 *     --expect  default 957; the population must equal it exactly or the build exits non-zero
 *     --force   allow wiping a root that already holds grader output (audit-*.json)
 *
 * Population: agent-review-select.mjs selectRelease(run).release - the SAME code agent-review-release.mjs runs, so
 * the audited ids are exactly the ids its dry run says it would write. Never re-derived by cohort name.
 * Writes <cohort>--pN/{packet.md,index.json}, AUDIT-BRIEF.md, GRADER-PROMPT.md, PACKETS.txt and MANIFEST.json.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { client, rowsByIds, refuseAndExit } from './autonomy-io.mjs'
import { RefusalError } from './autonomy-core.mjs'
import { selectRelease } from './agent-review-select.mjs'
import { normalizeDisplayText } from './act-science-regrade/act-sci-packet.mjs'

const HERE = new URL('.', import.meta.url).pathname
const REPO = resolve(HERE, '../..')
const argv = process.argv.slice(2)
const flag = (name, dflt) => { const i = argv.indexOf(`--${name}`); if (i < 0) return dflt; const v = argv[i + 1]; if (v == null || v.startsWith('--')) throw new RefusalError(`--${name} needs a value`); return v }
const MAX_PER_PACKET = 44
const SLOTS = ['A', 'B', 'C', 'D', 'E']
const CHOICES = { ssat: 5, map: 4 }
const sha = s => createHash('sha256').update(s).digest('hex')
const put = (p, body) => writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body, null, 1) + '\n')
const hasAuditFiles = dir => existsSync(dir) && readdirSync(dir, { withFileTypes: true }).some(e => e.isDirectory() && readdirSync(join(dir, e.name)).some(f => /^audit-[ab]\.json$/.test(f)))

const graderPrompt = ({ k, name, root, dir, n }) =>
  `You are verbal auditor ${k} for packet ${name}. Read ${join(root, 'AUDIT-BRIEF.md')} and then ${join(dir, 'packet.md')}, and nothing else in the repo. `
  + (k === 'b' ? 'ASSUME every passage set and every standalone item in this packet contains at least one defect - a wrong key, a second defensible option, a key the passage does not support, an item answerable without its required source, a false fact, an unintended language error, an explanation that does not match the key, or a typo - and hunt for it. Argue FOR every distractor as a careful student would, and argue against each key before accepting it. Flag only what you can show. ' : '')
  + `Write ${join(dir, `audit-${k}.json`)} exactly in the brief's shape, one entry for each of the ${n} item ids in the packet (Q01..Q${String(n).padStart(2, '0')}). Claude only, no database, no other files, write only your own file.`

try {
  const RUN = flag('run', 'agentreview-audit-cofounder-2026-10-29')
  const EXPECT = Number(flag('expect', '957'))
  const root = resolve(flag('root', join(REPO, 'scratchpad/verbal-audit')))
  if (!Number.isInteger(EXPECT) || EXPECT <= 0) throw new RefusalError('--expect must be a positive integer')
  if (hasAuditFiles(root) && !argv.includes('--force')) throw new RefusalError(`${root} already holds grader output (audit-*.json); pass --force to wipe it`)

  const db = client()
  const sel = await selectRelease(db, RUN)
  const population = sel.release.flatMap(c => c.ids.map(id => ({ id, cohort: c.cohort })))
  if (new Set(population.map(p => p.id)).size !== population.length) throw new RefusalError('selection holds a duplicate id')
  if (population.length !== sel.releaseCount) throw new RefusalError(`selection flattened to ${population.length}, releaseCount ${sel.releaseCount}`)
  if (population.length !== EXPECT) throw new RefusalError(`population is ${population.length}, expected exactly ${EXPECT} (agent-review-release dry run)`)

  const rows = await rowsByIds(db, 'study_item_bank', 'id,cohort,family,section,domain,task,verified,archived,passage_group_id,item,content_sha,updated_at,created_at', population.map(p => p.id), 'audit population')
  if (rows.length !== EXPECT) throw new RefusalError(`read ${rows.length} rows of ${EXPECT}`)
  const byId = new Map(rows.map(r => [r.id, r]))
  const problems = []
  for (const p of population) {
    const r = byId.get(p.id), it = r.item ?? {}
    if (r.cohort !== p.cohort) problems.push(`${r.id}: cohort ${r.cohort} != selection's ${p.cohort}`)
    if (r.verified || r.archived) problems.push(`${r.id}: not staged (verified=${r.verified}, archived=${r.archived})`)
    if (!CHOICES[r.family]) problems.push(`${r.id}: family ${r.family} is not ssat/map`)
    else if (it.choices?.length !== CHOICES[r.family]) problems.push(`${r.id}: ${it.choices?.length} choices, ${r.family} needs ${CHOICES[r.family]}`)
    if (!it.choices?.includes(it.correct_answer)) problems.push(`${r.id}: key is not one of its choices`)
    if (it.choices && new Set(it.choices).size !== it.choices.length) problems.push(`${r.id}: duplicate choices`)
    if (it.graphic) problems.push(`${r.id}: has a graphic this builder cannot render`)
    if (!String(it.prompt ?? '').trim()) problems.push(`${r.id}: empty prompt`)
  }
  if (problems.length) throw new RefusalError(`${problems.length} item(s) cannot be shown faithfully:\n  ${problems.slice(0, 20).join('\n  ')}`)

  if (existsSync(root)) rmSync(root, { recursive: true })
  mkdirSync(root, { recursive: true })
  const manifest = { built_at: new Date().toISOString(), run: RUN, prereg: 'scripts/study-bank/VERBAL-AUDIT-2026-10-31.prereg.md', brief: join(root, 'AUDIT-BRIEF.md'), population: EXPECT, items: 0, units: 0, packets: [], packet_dirs: [] }
  const perCohort = {}

  for (const { cohort } of sel.release) {
    const mine = rows.filter(r => r.cohort === cohort).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.id.localeCompare(b.id))
    if (!mine.length) continue
    const units = new Map()
    for (const r of mine) {
      const key = r.passage_group_id ?? r.id
      if (!units.has(key)) units.set(key, { key, set: r.passage_group_id != null, rows: [] })
      units.get(key).rows.push(r)
    }
    const list = [...units.values()]
    const nPk = Math.max(1, Math.ceil(mine.length / MAX_PER_PACKET)), target = Math.ceil(mine.length / nPk)
    const chunks = [[]]
    let filled = 0
    for (const u of list) {
      if (filled && filled + u.rows.length > target && chunks.length < nPk) { chunks.push([]); filled = 0 }
      chunks.at(-1).push(u); filled += u.rows.length
    }
    const c = (perCohort[cohort] = { items: mine.length, units: list.length, sets: list.filter(u => u.set).length, packets: 0 })
    chunks.forEach((chunk, k) => {
      const name = `${cohort}--p${k + 1}`, dir = join(root, name)
      mkdirSync(dir, { recursive: true })
      const L = [`# Verbal audit packet ${name}`, '', `Read ${join(root, 'AUDIT-BRIEF.md')} first. Keys and explanations are shown on purpose: cover the KEY line and solve each item before reading it.`, '']
      const index = { packet: name, cohort, items: [] }
      let q = 0
      for (const u of chunk) {
        const first = u.rows[0], fp = normalizeDisplayText(first.item?.passage ?? '')
        if (u.set) {
          L.push(`## PASSAGE SET ${u.key}  (${u.rows.length} questions)`, '', ...(first.item?.passage_title ? [`TITLE: ${first.item.passage_title}`, ''] : []), fp || '(no passage text)', '')
        }
        for (const r of u.rows) {
          const it = r.item, id = `Q${String(++q).padStart(2, '0')}`
          const ownPassage = normalizeDisplayText(it.passage ?? '')
          const source_check = (u.set || (ownPassage.trim() && r.domain !== 'Vocabulary')) ? 'required' : 'not_applicable'
          L.push(`### ${id}  (${[r.domain, it.subskill].filter(Boolean).join('; ')})`, '')
          if (u.set && ownPassage !== fp) L.push('THIS ITEM\'S OWN PASSAGE TEXT (differs from the set passage above):', ownPassage || '(none)', '')
          if (!u.set && ownPassage.trim()) L.push('STIMULUS:', ownPassage, '')
          L.push(`SOURCE CHECK: ${source_check === 'required' ? 'required' : 'not applicable'}`, '',
            `QUESTION: ${normalizeDisplayText(it.prompt)}`, ...it.choices.map((o, i) => `  ${SLOTS[i]}) ${o}`), '',
            `KEY: ${SLOTS[it.choices.indexOf(it.correct_answer)]}) ${it.correct_answer}`,
            `AUTHOR'S EXPLANATION: ${normalizeDisplayText(it.explanation ?? '') || '(none)'}`)
          if (it.distractor_rationales) L.push(`AUTHOR'S DISTRACTOR NOTES: ${JSON.stringify(it.distractor_rationales)}`)
          L.push('')
          index.items.push({ id, row_id: r.id, cohort, passage: u.key, source_check, content_sha: r.content_sha ?? null, updated_at: r.updated_at })
        }
      }
      const text = L.join('\n') + '\n'
      put(join(dir, 'packet.md'), text)
      put(join(dir, 'index.json'), index)
      c.packets++
      manifest.items += index.items.length; manifest.units += chunk.length
      manifest.packet_dirs.push(dir)
      manifest.packets.push({
        packet: name, cohort, dir, units: chunk.length, items: index.items.length, packet_sha256: sha(text),
        graders: ['a', 'b'].map(g => ({ id: g, mode: g === 'a' ? 'plain' : 'adversarial', output: join(dir, `audit-${g}.json`), prompt: graderPrompt({ k: g, name, root, dir, n: index.items.length }) })),
      })
    })
  }
  if (manifest.items !== EXPECT) throw new RefusalError(`packed ${manifest.items} items, population ${EXPECT}`)

  put(join(root, 'AUDIT-BRIEF.md'), readFileSync(join(HERE, 'VERBAL-AUDIT-BRIEF.md'), 'utf8'))
  put(join(root, 'GRADER-PROMPT.md'), [
    '# Verbal audit grader prompt (template)', '',
    `Two graders per packet, independent (VERBAL-AUDIT-2026-10-31.prereg.md). The filled prompt for every packet is in MANIFEST.json packets[].graders[].prompt; this is the template it was filled from.`, '',
    '## Grader a (plain)', '', '```', graderPrompt({ k: 'a', name: '{{PACKET}}', root, dir: join(root, '{{PACKET}}'), n: '{{N}}' }), '```', '',
    '## Grader b (adversarial)', '', '```', graderPrompt({ k: 'b', name: '{{PACKET}}', root, dir: join(root, '{{PACKET}}'), n: '{{N}}' }), '```', '',
    'Packet directories, one per line: PACKETS.txt. Score with `node scripts/study-bank/verbal-audit-score.mjs` once every audit-a.json and audit-b.json exists.', '',
  ].join('\n'))
  put(join(root, 'PACKETS.txt'), manifest.packet_dirs.join('\n') + '\n')
  put(join(root, 'MANIFEST.json'), manifest)

  console.log(`population ${EXPECT} (= ${RUN} release set); built ${manifest.packets.length} packets, ${manifest.items} items in ${manifest.units} units under ${root}`)
  for (const [k, v] of Object.entries(perCohort)) console.log(`  ${k.padEnd(26)} items ${String(v.items).padStart(3)}  units ${String(v.units).padStart(3)} (passage sets ${v.sets})  packets ${v.packets}`)
  const src = manifest.packets.flatMap(p => JSON.parse(readFileSync(join(p.dir, 'index.json'), 'utf8')).items)
  console.log(`source_check required ${src.filter(i => i.source_check === 'required').length}, not_applicable ${src.filter(i => i.source_check === 'not_applicable').length}`)
} catch (e) { refuseAndExit(e) }
