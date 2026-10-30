/**
 * verbal-audit-core.mjs — the pure half of the verbal key-visible audit (VERBAL-AUDIT-2026-10-31.prereg.md).
 * No IO. An item is HELD if either grader marks key_verified false or raises a flagging issue (no_source counts
 * only where the item's source_check is 'required'); a held item holds its whole passage set. A missing, empty or
 * malformed grader file refuses the packet instead of scoring it.
 */
export class AuditError extends Error {}

export const FLAG_TYPES = ['second_defensible', 'no_support', 'no_source', 'fact_error', 'language_error', 'explanation_mismatch', 'typo_rendering']
export const SOFT_TYPES = ['style', 'note']
export const ISSUE_TYPES = [...FLAG_TYPES, ...SOFT_TYPES]
export const GRADERS = ['a', 'b']
export const SOURCE_CHECKS = ['required', 'not_applicable']

/** Problems with one grader file against the packet's item ids; [] when valid. `batch_patterns` is optional. */
export function validateAudit(doc, ids) {
  const errs = []
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return ['not a JSON object keyed by item id']
  const want = new Set(ids)
  for (const id of want) if (!(id in doc)) errs.push(`${id}: missing`)
  for (const [id, v] of Object.entries(doc)) {
    if (id === 'batch_patterns') {
      if (!Array.isArray(v)) errs.push('batch_patterns must be an array')
      else v.forEach((p, i) => { if (!p || typeof p.pattern !== 'string' || !p.pattern.trim()) errs.push(`batch_patterns ${i + 1}: needs a "pattern" string`) })
      continue
    }
    if (!want.has(id)) { errs.push(`${id}: not an item of this packet`); continue }
    if (!v || typeof v !== 'object' || Array.isArray(v)) { errs.push(`${id}: not an object`); continue }
    if (typeof v.key_verified !== 'boolean') errs.push(`${id}: key_verified must be true or false`)
    if (!Array.isArray(v.issues)) { errs.push(`${id}: issues must be an array`); continue }
    v.issues.forEach((x, i) => {
      if (!x || !ISSUE_TYPES.includes(x.type)) errs.push(`${id}: issue ${i + 1} type "${x?.type}" is not one of ${ISSUE_TYPES.join(', ')}`)
      else if (typeof x.detail !== 'string' || !x.detail.trim()) errs.push(`${id}: issue ${i + 1} has no detail`)
    })
  }
  return errs
}

/**
 * index: { packet, items: [{ id, row_id, cohort, passage, source_check }] }; audits: { a: doc, b: doc }.
 * Returns { items, flagged: [{ id, row_id, cohort, passage, reasons }], heldPassages: [{ cohort, passage, items,
 * row_ids, flagged }], ignored: [{ id, row_id, grader, detail }], batchPatterns: [{ grader, ...pattern }] }.
 */
export function scorePacket(index, audits) {
  const items = index?.items ?? []
  const ids = items.map(i => i.id)
  if (!ids.length) throw new AuditError(`${index?.packet ?? '?'}: index holds zero items`)
  if (new Set(ids).size !== ids.length) throw new AuditError(`${index.packet}: duplicate item ids in index`)
  for (const it of items) {
    if (!SOURCE_CHECKS.includes(it.source_check)) throw new AuditError(`${index.packet} ${it.id}: source_check "${it.source_check}" is not one of ${SOURCE_CHECKS.join(', ')}`)
    if (!it.row_id || !it.cohort || !it.passage) throw new AuditError(`${index.packet} ${it.id}: index entry needs row_id, cohort and passage`)
  }
  for (const k of GRADERS) {
    if (audits?.[k] == null) throw new AuditError(`${index.packet}: audit-${k}.json missing`)
    const errs = validateAudit(audits[k], ids)
    if (errs.length) throw new AuditError(`${index.packet}: audit-${k}.json malformed (${errs.length}):\n  ${errs.slice(0, 15).join('\n  ')}`)
  }
  const flagged = [], ignored = [], batchPatterns = []
  for (const it of items) {
    const reasons = []
    for (const k of GRADERS) {
      const v = audits[k][it.id]
      if (v.key_verified === false) reasons.push(`${k}: key not verified`)
      for (const x of v.issues) {
        if (!FLAG_TYPES.includes(x.type)) continue
        if (x.type === 'no_source' && it.source_check !== 'required') { ignored.push({ id: it.id, row_id: it.row_id, grader: k, detail: x.detail }); continue }
        reasons.push(`${k}: ${x.type}: ${x.detail}`)
      }
    }
    if (reasons.length) flagged.push({ id: it.id, row_id: it.row_id, cohort: it.cohort, passage: it.passage, reasons })
  }
  for (const k of GRADERS) for (const p of audits[k].batch_patterns ?? []) batchPatterns.push({ packet: index.packet, grader: k, ...p })
  const heldKeys = [...new Set(flagged.map(f => `${f.cohort}|${f.passage}`))]
  const heldPassages = heldKeys.map(key => {
    const [cohort, passage] = key.split('|')
    const members = items.filter(i => i.cohort === cohort && i.passage === passage)
    return { cohort, passage, items: members.map(i => i.id), row_ids: members.map(i => i.row_id), flagged: flagged.filter(f => f.cohort === cohort && f.passage === passage).map(f => f.id) }
  })
  return { items: ids.length, flagged, heldPassages, ignored, batchPatterns }
}

/** packets: [{ index, audits }] -> totals plus per-cohort counts. Throws on the first packet that cannot be scored. */
export function scoreAll(packets) {
  if (!packets.length) throw new AuditError('zero packets: nothing to score')
  const out = { items: 0, packets: packets.length, flagged: [], heldPassages: [], ignored: [], batchPatterns: [], perCohort: {} }
  const seenRows = new Set()
  for (const p of packets) {
    const s = scorePacket(p.index, p.audits)
    for (const it of p.index.items) {
      if (seenRows.has(it.row_id)) throw new AuditError(`${p.index.packet}: row ${it.row_id} appears in more than one packet`)
      seenRows.add(it.row_id)
    }
    out.items += s.items
    out.flagged.push(...s.flagged); out.heldPassages.push(...s.heldPassages); out.ignored.push(...s.ignored); out.batchPatterns.push(...s.batchPatterns)
    for (const it of p.index.items) {
      const c = (out.perCohort[it.cohort] ??= { items: 0, units: new Set(), flaggedItems: 0, heldUnits: 0, heldItems: 0 })
      c.items++; c.units.add(it.passage)
    }
  }
  // a passage set never spans packets (the builder guarantees it); check rather than trust
  const unitPackets = new Map()
  for (const p of packets) for (const it of p.index.items) {
    const k = `${it.cohort}|${it.passage}`
    if (unitPackets.has(k) && unitPackets.get(k) !== p.index.packet) throw new AuditError(`passage ${k} is split across ${unitPackets.get(k)} and ${p.index.packet}`)
    unitPackets.set(k, p.index.packet)
  }
  for (const f of out.flagged) out.perCohort[f.cohort].flaggedItems++
  for (const h of out.heldPassages) { out.perCohort[h.cohort].heldUnits++; out.perCohort[h.cohort].heldItems += h.items.length }
  for (const c of Object.values(out.perCohort)) c.units = c.units.size
  return out
}
