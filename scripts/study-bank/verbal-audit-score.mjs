#!/usr/bin/env node
/**
 * verbal-audit-score.mjs — scores the verbal key-visible audit (VERBAL-AUDIT-2026-10-31.prereg.md).
 *
 *   node scripts/study-bank/verbal-audit-score.mjs [--root <dir>]     (default <repo>/scratchpad/verbal-audit)
 *
 * Reads <root>/MANIFEST.json, then each packet's index.json, audit-a.json and audit-b.json. Exits non-zero, and
 * writes nothing, on any missing, empty or malformed file, on an index whose count differs from the manifest, or on
 * a scored total that differs from the manifest's items or population. Prints denominators first, then writes
 * <root>/FLAGGED.json stamped with the manifest's built_at. Releases and changes nothing.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { AuditError, scoreAll } from './verbal-audit-core.mjs'

const REPO = resolve(new URL('.', import.meta.url).pathname, '../..')
const argv = process.argv.slice(2)
const ri = argv.indexOf('--root')
const root = resolve(ri >= 0 ? argv[ri + 1] ?? '' : join(REPO, 'scratchpad/verbal-audit'))
const readJson = p => {
  if (!existsSync(p)) throw new AuditError(`missing ${p}`)
  const txt = readFileSync(p, 'utf8')
  if (!txt.trim()) throw new AuditError(`${p}: empty file`)
  try { return JSON.parse(txt) } catch (e) { throw new AuditError(`${p}: not valid JSON (${e.message})`) }
}

// a refused run must not leave an older FLAGGED.json that reads as this run's result
rmSync(join(root, 'FLAGGED.json'), { force: true })

try {
  if (ri >= 0 && !argv[ri + 1]) throw new AuditError('--root needs a value')
  const manifest = readJson(join(root, 'MANIFEST.json'))
  if (!Array.isArray(manifest.packets) || !manifest.packets.length) throw new AuditError('MANIFEST.json lists no packets')
  if (!Number.isInteger(manifest.items) || manifest.items !== manifest.population) throw new AuditError(`MANIFEST items ${manifest.items} != population ${manifest.population}`)
  const sumPackets = manifest.packets.reduce((n, p) => n + p.items, 0)
  if (sumPackets !== manifest.items) throw new AuditError(`MANIFEST packets sum to ${sumPackets} items, manifest says ${manifest.items}`)
  const packets = manifest.packets.map(p => {
    const dir = join(root, p.packet)
    const index = readJson(join(dir, 'index.json'))
    if (index.packet !== p.packet) throw new AuditError(`${p.packet}: index.json is for ${index.packet}`)
    if (index.items?.length !== p.items) throw new AuditError(`${p.packet}: index holds ${index.items?.length} items, manifest says ${p.items}`)
    return { index, audits: { a: readJson(join(dir, 'audit-a.json')), b: readJson(join(dir, 'audit-b.json')) } }
  })
  const s = scoreAll(packets)
  if (s.items !== manifest.items) throw new AuditError(`scored ${s.items} items but the manifest totals ${manifest.items}`)
  console.log(`scored ${s.items} of ${manifest.items} items (population ${manifest.population}), ${s.packets} of ${manifest.packets.length} packets`)
  for (const [c, v] of Object.entries(s.perCohort).sort()) console.log(`  ${c.padEnd(26)} items ${String(v.items).padStart(3)}  units ${String(v.units).padStart(3)}  flagged items ${String(v.flaggedItems).padStart(3)}  held units ${v.heldUnits} (${v.heldItems} items)`)
  const heldItems = s.heldPassages.reduce((n, h) => n + h.items.length, 0)
  console.log(`FLAGGED ${s.flagged.length} item(s); HELD ${s.heldPassages.length} unit(s), ${heldItems} item(s); clear ${s.items - heldItems}. no_source ignored (not applicable): ${s.ignored.length}. batch patterns reported: ${s.batchPatterns.length}.`)
  console.log('Nothing is released or changed by this script.')
  const out = join(root, 'FLAGGED.json')
  writeFileSync(out, JSON.stringify({ built_at: manifest.built_at, run: manifest.run, scored_items: s.items, packets: s.packets, held_items: heldItems, perCohort: s.perCohort, heldPassages: s.heldPassages, flagged: s.flagged, ignored_no_source: s.ignored, batch_patterns: s.batchPatterns }, null, 1) + '\n')
  console.log(`wrote ${out}`)
} catch (e) {
  console.error(`REFUSED: ${e.message}`)
  process.exit(e instanceof AuditError ? 2 : 1)
}
