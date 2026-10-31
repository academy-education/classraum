#!/usr/bin/env node
// Stage 2 decision for MAP Science b4 (MAP-SCIENCE-B4.prereg.md, stage 2). Modelled on stage2-decide-b3full.mjs.
// Reads the audit FLAGGED.json written by science-audit-score.mjs (unchanged) and applies the owner's science
// release rule (2026-10-30) as the b3-full coordinator applied it:
//   - a MODEL item (standalone knowledge: no passage, no figure) whose only flag is `no_source` CLEARS: knowledge is
//     the construct there, not a defect;
//   - a DATA or INVESTIGATION item flagged `no_source` HOLDS, even when it is the only flag: its figure or procedure
//     adds nothing, which is the defect (b3 full's E5-02, a data item whose table was exactly 1/d^2, held by the
//     coordinator at release; b4 encodes that practice here instead of in the release script);
//   - ANY other flag, including an auditor's key_verified=false, HOLDS.
// Writes STAGE2-DECISION.json and cleared.json (the only ids stage-map-science-b4.mjs will stage).
//   node stage2-decide-b4.mjs [--root <repo>]
import fs from 'node:fs'
import path from 'node:path'
const args = process.argv.slice(2)
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const ROOT = path.resolve(flag('--root', process.cwd()))
const WORK = path.join(ROOT, 'scripts/study-bank/map-v2-work/science-b4')
const AUD = path.join(ROOT, 'scratchpad/map-science-b4/audit')
const die = (m) => { console.error('REFUSED: ' + m); process.exit(2) }
const rd = (p) => { if (!fs.existsSync(p)) die('missing ' + p); return JSON.parse(fs.readFileSync(p, 'utf8')) }
const s1 = rd(path.join(WORK, 'STAGE1-DECISION.json')), M = rd(path.join(AUD, 'MANIFEST.json')), F = rd(path.join(AUD, 'FLAGGED.json'))
const items = ['L', 'P', 'E'].flatMap((A) => rd(path.join(WORK, `items/${A}.json`)))
const kindOf = new Map(items.map((x) => [x.id, x.kind]))
const audited = M.packets.flatMap((p) => rd(path.join(AUD, p.packet, 'index.json')).items)
if (audited.length !== M.items || F.scored_items !== M.items) die(`audited ${audited.length}, scored ${F.scored_items}, manifest ${M.items}`)
if (F.notAuditable?.length) die(`${F.notAuditable.length} items not auditable`)
const s1ids = Object.values(s1.areas).flatMap((a) => a.survivor_ids)
if (s1ids.length !== audited.length || s1ids.some((id) => !audited.some((x) => x.id === id))) die('audited population differs from the stage-1 survivors')
for (const x of audited) if (!['model', 'data', 'investigation'].includes(kindOf.get(x.id))) die(`${x.id}: unknown kind ${kindOf.get(x.id)}`)
const isNoSourceOnly = (f) => f.reasons.length > 0 && f.reasons.every((r) => /^\w+: no_source:/.test(r))
const clearsNoSource = (f) => isNoSourceOnly(f) && kindOf.get(f.id) === 'model'
const held = F.flagged.filter((f) => !clearsNoSource(f)).map((f) => ({ ...f, kind: kindOf.get(f.id), why: isNoSourceOnly(f) ? `no_source on a ${kindOf.get(f.id)} item: the figure/procedure adds nothing (b3 E5-02 practice)` : 'a flag other than no_source' }))
const noSrcCleared = F.flagged.filter(clearsNoSource)
const heldIds = new Set(held.map((f) => f.id))
const cleared = audited.filter((x) => !heldIds.has(x.id)).map((x) => x.id)
const per = {}
for (const x of audited) { const c = (per[x.cohort] ??= { audited: 0, held: 0, no_source_only_cleared: 0, cleared: 0 }); c.audited++; if (heldIds.has(x.id)) c.held++; else c.cleared++ }
for (const f of noSrcCleared) per[f.cohort].no_source_only_cleared++
const out = { generated: new Date().toISOString().slice(0, 10), rule: 'owner 2026-10-30: MAP Science no_source alone clears a standalone knowledge (model) item; no_source on a data/investigation item holds (b3 E5-02 practice); any other flag (or key not verified) holds', audit_built_at: M.built_at, perCohort: per, held, no_source_only_cleared: noSrcCleared, cleared }
fs.writeFileSync(path.join(WORK, 'STAGE2-DECISION.json'), JSON.stringify(out, null, 1) + '\n')
fs.writeFileSync(path.join(WORK, 'cleared.json'), JSON.stringify(cleared, null, 1) + '\n')
console.log(`audited ${audited.length} of ${M.items}; flagged ${F.flagged.length} (no_source-only on model items, cleared: ${noSrcCleared.length}); held ${held.length}; cleared ${cleared.length}`)
for (const [c, v] of Object.entries(per)) console.log(`  ${c.padEnd(22)} audited ${v.audited}  held ${v.held}  cleared ${v.cleared} (incl. ${v.no_source_only_cleared} no_source-only)`)
for (const h of held) console.log(`  HELD ${h.id} (${h.kind}; ${h.why}): ${h.reasons.map((r) => r.slice(0, 110)).join(' | ')}`)
