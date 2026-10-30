#!/usr/bin/env node
// Stage 2 decision for MAP Science b3 full: reads the audit FLAGGED.json written by science-audit-score.mjs and
// applies the owner's science release rule (2026-10-30): for MAP Science, an item whose only flag is `no_source`
// clears (standalone knowledge items: no_source is the construct, not a defect); ANY other flag, including an
// auditor's key_verified=false, holds the item. Writes STAGE2-DECISION.json and cleared.json (the stage-2 survivors,
// the only ids stage-map-science-b3full.mjs will stage).
//   node stage2-decide-b3full.mjs [--root <repo>]
import fs from 'node:fs'
import path from 'node:path'
const args = process.argv.slice(2)
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const ROOT = path.resolve(flag('--root', process.cwd()))
const WORK = path.join(ROOT, 'scripts/study-bank/map-v2-work/science-b3full')
const AUD = path.join(ROOT, 'scratchpad/map-science-b3full/audit')
const die = (m) => { console.error('REFUSED: ' + m); process.exit(2) }
const rd = (p) => { if (!fs.existsSync(p)) die('missing ' + p); return JSON.parse(fs.readFileSync(p, 'utf8')) }
const s1 = rd(path.join(WORK, 'STAGE1-DECISION.json')), M = rd(path.join(AUD, 'MANIFEST.json')), F = rd(path.join(AUD, 'FLAGGED.json'))
const audited = M.packets.flatMap((p) => rd(path.join(AUD, p.packet, 'index.json')).items)
if (audited.length !== M.items || F.scored_items !== M.items) die(`audited ${audited.length}, scored ${F.scored_items}, manifest ${M.items}`)
const s1ids = Object.values(s1.areas).flatMap((a) => a.survivor_ids)
if (s1ids.length !== audited.length || s1ids.some((id) => !audited.some((x) => x.id === id))) die('audited population differs from the stage-1 survivors')
const isNoSourceOnly = (f) => f.reasons.every((r) => /^\w+: no_source:/.test(r))
const held = F.flagged.filter((f) => !isNoSourceOnly(f)), noSrc = F.flagged.filter(isNoSourceOnly)
const heldIds = new Set(held.map((f) => f.id))
const cleared = audited.filter((x) => !heldIds.has(x.id)).map((x) => x.id)
const per = {}
for (const x of audited) { const c = (per[x.cohort] ??= { audited: 0, held: 0, no_source_only_cleared: 0, cleared: 0 }); c.audited++; if (heldIds.has(x.id)) c.held++; else c.cleared++ }
for (const f of noSrc) per[f.cohort].no_source_only_cleared++
const out = { generated: new Date().toISOString().slice(0, 10), rule: 'owner 2026-10-30: MAP Science no_source alone clears; any other flag (or key not verified) holds', audit_built_at: M.built_at, perCohort: per, held, no_source_only_cleared: noSrc, cleared }
fs.writeFileSync(path.join(WORK, 'STAGE2-DECISION.json'), JSON.stringify(out, null, 1) + '\n')
fs.writeFileSync(path.join(WORK, 'cleared.json'), JSON.stringify(cleared, null, 1) + '\n')
console.log(`audited ${audited.length} of ${M.items}; flagged ${F.flagged.length} (no_source only ${noSrc.length}); held ${held.length}; cleared ${cleared.length}`)
for (const [c, v] of Object.entries(per)) console.log(`  ${c.padEnd(22)} audited ${v.audited}  held ${v.held}  cleared ${v.cleared} (incl. ${v.no_source_only_cleared} no_source-only)`)
for (const h of held) console.log(`  HELD ${h.id}: ${h.reasons.map((r) => r.slice(0, 110)).join(' | ')}`)
