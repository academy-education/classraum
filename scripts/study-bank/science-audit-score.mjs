#!/usr/bin/env node
/**
 * science-audit-score.mjs — scores the science key-visible audit (SCIENCE-AUDIT-2026-10-30.prereg.md).
 *
 *   node scripts/study-bank/science-audit-score.mjs [<root>]     (default ./scratchpad/science-audit)
 *
 * Reads <root>/MANIFEST.json, then each packet's index.json, audit-a.json and audit-b.json. Exits non-zero, and
 * writes nothing, on any missing or malformed file. Prints denominators first, then writes <root>/FLAGGED.json.
 * Items listed in NOT-AUDITABLE.json are held too and reported apart: no auditor ever saw them.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { AuditError, scoreAll } from './science-audit-core.mjs'

const root = resolve(process.argv[2] ?? 'scratchpad/science-audit')
const readJson = p => {
  if (!existsSync(p)) throw new AuditError(`missing ${p}`)
  try { return JSON.parse(readFileSync(p, 'utf8')) } catch (e) { throw new AuditError(`${p}: ${e.message}`) }
}

// a refused run must not leave an older FLAGGED.json that reads as this run's result
rmSync(join(root, 'FLAGGED.json'), { force: true })

try {
  const manifest = readJson(join(root, 'MANIFEST.json'))
  if (!Array.isArray(manifest.packets) || !manifest.packets.length) throw new AuditError('MANIFEST.json lists no packets')
  const packets = manifest.packets.map(p => {
    const dir = join(root, p.packet)
    const index = readJson(join(dir, 'index.json'))
    if (index.items?.length !== p.items) throw new AuditError(`${p.packet}: index holds ${index.items?.length} items, manifest says ${p.items}`)
    return { index, audits: { a: readJson(join(dir, 'audit-a.json')), b: readJson(join(dir, 'audit-b.json')) } }
  })
  const s = scoreAll(packets)
  if (s.items !== manifest.items) throw new AuditError(`scored ${s.items} items but the manifest totals ${manifest.items}`)
  const na = existsSync(join(root, 'NOT-AUDITABLE.json')) ? readJson(join(root, 'NOT-AUDITABLE.json')) : []
  console.log(`scored ${s.items} of ${manifest.items} items, ${s.packets} of ${manifest.packets.length} packets; not auditable (held, never shown): ${na.length}`)
  for (const [c, v] of Object.entries(s.perCohort).sort()) console.log(`  ${c.padEnd(22)} items ${String(v.items).padStart(3)}  passages ${String(v.passages).padStart(3)}  flagged items ${String(v.flaggedItems).padStart(3)}  held passages ${v.heldPassages} (${v.heldItems} items)`)
  console.log(`FLAGGED ${s.flagged.length} item(s); HELD ${s.heldPassages.length} passage(s), ${s.heldPassages.reduce((n, h) => n + h.items.length, 0)} item(s). Nothing is released or changed by this script.`)
  const out = join(root, 'FLAGGED.json')
  writeFileSync(out, JSON.stringify({ scored_items: s.items, packets: s.packets, perCohort: s.perCohort, heldPassages: s.heldPassages, flagged: s.flagged, notAuditable: na }, null, 1) + '\n')
  console.log(`wrote ${out}`)
} catch (e) {
  console.error(`REFUSED: ${e.message}`)
  process.exit(e instanceof AuditError ? 2 : 1)
}
