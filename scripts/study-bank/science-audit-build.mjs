#!/usr/bin/env node
/**
 * science-audit-build.mjs — builds the science key-visible audit packets (SCIENCE-AUDIT-2026-10-30.prereg.md).
 * Read-only against the bank.
 *
 *   node scripts/study-bank/science-audit-build.mjs [<root>]     (default ./scratchpad/science-audit)
 *
 * Population: staged rows (verified=false, archived=false) whose qid is on the cohort's cleared list in
 * science-release.json. Figures go through act-sci-packet decodeGraphic; a refused figure sends its item to
 * NOT-AUDITABLE.json and it is never shown to an auditor. Writes <cohort>--pN/{packet.md,index.json},
 * AUDIT-BRIEF.md, NOT-AUDITABLE.json and MANIFEST.json (2 auditors per packet).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { client, pageExact } from './autonomy-io.mjs'
import { decodeGraphic, normalizeDisplayText, Refusal } from './act-science-regrade/act-sci-packet.mjs'

const HERE = new URL('.', import.meta.url).pathname
const root = resolve(process.argv[2] ?? 'scratchpad/science-audit')
const COHORTS = [
  'act-science-v6b', 'act-science-v7b', 'act-science-v8b', 'act-science-v10a', 'act-science-v10b', 'act-science-v11a',
  'act-science-v12a', 'act-science-v12b', 'act-science-v12c', 'act-science-v12d', 'act-science-v12e', 'act-science-v12f',
  'map-science-pilot', 'map-science-v1-life', 'map-science-v1-phys', 'map-science-v1-earth',
]
const PER_PACKET = { act: 7, map: 8 }
const SLOTS = ['A', 'B', 'C', 'D']
const sha = s => createHash('sha256').update(s).digest('hex')
const qidOf = (cfg, row) => cfg.qid.split('.').reduce((o, k) => (o == null ? o : o[k]), row.verify_meta ?? {})
const put = (p, body) => writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body, null, 1) + '\n')

const release = JSON.parse(readFileSync(join(HERE, 'science-release.json'), 'utf8')).cohorts
const db = client()
const manifest = { built_at: new Date().toISOString(), prereg: 'scripts/study-bank/SCIENCE-AUDIT-2026-10-30.prereg.md', brief: join(root, 'AUDIT-BRIEF.md'), items: 0, passages: 0, packets: [] }
const notAuditable = [], missing = [], perCohort = {}

if (existsSync(join(root, 'MANIFEST.json'))) rmSync(root, { recursive: true })
mkdirSync(root, { recursive: true })

for (const cohort of COHORTS) {
  const cfg = release[cohort]
  if (!cfg?.cleared) throw new Refusal(`${cohort}: no cleared list in science-release.json`)
  const fam = cfg.family.startsWith('act') ? 'act' : 'map'
  const cleared = JSON.parse(readFileSync(join(HERE, cfg.cleared), 'utf8')).filter(q => !cfg.qidPrefix || q.startsWith(cfg.qidPrefix))
  if (!cleared.length) throw new Refusal(`${cohort}: cleared list is empty for this cohort`)
  const rows = await pageExact(db, 'study_item_bank', 'id,cohort,family,section,verified,archived,passage_group_id,task,domain,item,verify_meta,created_at',
    q => q.eq('cohort', cohort).eq('verified', false).eq('archived', false), `${cohort} staged`)
  if (rows.some(r => r.section !== 'science')) throw new Refusal(`${cohort}: non-science rows`)
  const want = new Set(cleared), byQ = new Map()
  for (const r of rows) { const q = qidOf(cfg, r); if (want.has(q)) { if (byQ.has(q)) throw new Refusal(`${cohort}: qid ${q} on two staged rows`); byQ.set(q, r) } }
  for (const q of cleared) if (!byQ.has(q)) missing.push({ cohort, qid: q })

  // passages in authored order; MAP items are standalone
  const groups = new Map()
  for (const r of [...byQ.values()].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.id.localeCompare(b.id))) {
    const gid = fam === 'act' ? r.passage_group_id : r.id
    if (!gid) throw new Refusal(`${cohort}: ACT row ${r.id} has no passage_group_id`)
    if (!groups.has(gid)) groups.set(gid, [])
    groups.get(gid).push(r)
  }
  const auditable = []
  for (const [gid, items] of groups) {
    const pid = fam === 'act' ? gid.split(':').pop() : qidOf(cfg, items[0])
    const figs = new Map()
    let refused = null
    for (const r of items) {
      try { figs.set(r.id, decodeGraphic(r.item?.graphic ?? null)) } catch (e) { if (!(e instanceof Refusal)) throw e; refused = e.message }
    }
    if (refused) { notAuditable.push({ cohort, passage: pid, items: items.map(r => qidOf(cfg, r)), reason: refused }); continue }
    auditable.push({ gid, pid, items, figs })
  }
  const c = (perCohort[cohort] = { items: 0, passages: auditable.length, packets: 0, notAuditablePassages: groups.size - auditable.length })
  for (let k = 0; k * PER_PACKET[fam] < auditable.length; k++) {
    const chunk = auditable.slice(k * PER_PACKET[fam], (k + 1) * PER_PACKET[fam])
    const name = `${cohort}--p${k + 1}`, dir = join(root, name)
    mkdirSync(dir, { recursive: true })
    const L = [`# Science audit packet ${name}`, '', `Read ${join(root, 'AUDIT-BRIEF.md')} first. Keys and explanations are shown on purpose.`,
      fam === 'act' ? 'The figure under each passage is drawn under every question of that passage on screen; an item whose own figure differs prints it under the item.' : 'Each MAP item is standalone: its stimulus and figure are printed with it.', '']
    const index = { packet: name, cohort, family: fam, items: [] }
    for (const p of chunk) {
      const first = p.items[0], f0 = p.figs.get(first.id)
      L.push(`## PASSAGE ${p.pid}  (${cohort}${fam === 'act' ? `; ${first.task}, ${p.items.length} questions` : ''})`, '',
        ...(first.item?.passage_title ? [`TITLE: ${first.item.passage_title}`, ''] : []),
        normalizeDisplayText(first.item?.passage ?? '') || '(no passage text)', '', f0.text, '')
      for (const w of f0.warnings) L.push(`RENDER WARNING: ${w}`)
      if (f0.warnings.length) L.push('')
      for (const r of p.items) {
        const q = qidOf(cfg, r), it = r.item, ch = it.choices ?? []
        if (ch.length !== 4 || !ch.includes(it.correct_answer)) throw new Refusal(`${cohort} ${q}: needs 4 choices containing its key`)
        L.push(`### ${q}${r.domain ? `  (${r.domain})` : ''}`, '')
        if (r !== first && JSON.stringify(it.graphic ?? null) !== JSON.stringify(first.item?.graphic ?? null)) {
          const f = p.figs.get(r.id); L.push('THIS ITEM\'S OWN FIGURE:', f.text, ...f.warnings.map(w => `RENDER WARNING: ${w}`), '')
        }
        if (r !== first && (it.passage ?? '') !== (first.item?.passage ?? '')) L.push('THIS ITEM\'S OWN PASSAGE TEXT:', normalizeDisplayText(it.passage ?? ''), '')
        L.push(`QUESTION: ${normalizeDisplayText(it.prompt)}`, ...ch.map((o, i) => `  ${SLOTS[i]}) ${o}`), '',
          `KEY: ${SLOTS[ch.indexOf(it.correct_answer)]}) ${it.correct_answer}`, `AUTHOR'S EXPLANATION: ${normalizeDisplayText(it.explanation ?? '') || '(none)'}`)
        if (it.distractor_rationales) L.push(`AUTHOR'S DISTRACTOR NOTES: ${JSON.stringify(it.distractor_rationales)}`)
        L.push('')
        index.items.push({ id: q, cohort, passage: p.pid, row_id: r.id })
      }
    }
    const text = L.join('\n') + '\n'
    put(join(dir, 'packet.md'), text)
    put(join(dir, 'index.json'), index)
    c.items += index.items.length; c.packets++
    manifest.items += index.items.length; manifest.passages += chunk.length
    manifest.packets.push({ packet: name, cohort, passages: chunk.length, items: index.items.length, packet_sha256: sha(text), auditors: ['a', 'b'].map(k => ({
      id: k, mode: k === 'a' ? 'plain' : 'adversarial', output: join(dir, `audit-${k}.json`),
      prompt: `You are science auditor ${k} for packet ${name}. Read ${join(root, 'AUDIT-BRIEF.md')} and then ${join(dir, 'packet.md')}, and nothing else in the repo. `
        + (k === 'b' ? 'ASSUME every passage in this packet contains at least one error - a wrong key, a second defensible option, a value the key needs that cannot be read off the figure as rendered, a false fact or a self-contradiction, or an item answerable without the passage - and hunt for it; argue against each key before accepting it. Flag only what you can show. ' : '')
        + `Write ${join(dir, `audit-${k}.json`)} exactly in the brief's shape, one entry for each of the ${index.items.length} item ids in the packet. Claude only, no database, no other files, write only your own file.`,
    })) })
  }
}

put(join(root, 'NOT-AUDITABLE.json'), notAuditable.flatMap(n => n.items.map(id => ({ id, cohort: n.cohort, passage: n.passage, reason: n.reason }))))
put(join(root, 'MISSING.json'), missing)
put(join(root, 'AUDIT-BRIEF.md'), readFileSync(join(HERE, 'SCIENCE-AUDIT-BRIEF.md'), 'utf8'))
put(join(root, 'MANIFEST.json'), manifest)
console.log(`built ${manifest.packets.length} packets, ${manifest.items} items in ${manifest.passages} passages under ${root}`)
for (const [k, v] of Object.entries(perCohort)) console.log(`  ${k.padEnd(22)} packets ${v.packets}  passages ${String(v.passages).padStart(3)}  items ${String(v.items).padStart(3)}  not-auditable passages ${v.notAuditablePassages}`)
console.log(`not auditable (held, never shown): ${notAuditable.reduce((n, x) => n + x.items.length, 0)} items in ${notAuditable.length} passages; cleared qids with no staged row: ${missing.length}`)
