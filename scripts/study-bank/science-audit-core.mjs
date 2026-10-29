/**
 * science-audit-core.mjs — the pure half of the science key-visible audit (SCIENCE-AUDIT-2026-10-30.prereg.md).
 * No IO. An item is FLAGGED if either auditor marks key_verified false or raises a flagging issue; a flag holds
 * the item's whole passage. A missing or malformed auditor file refuses the packet instead of scoring it.
 */
export class AuditError extends Error {}

export const FLAG_TYPES = ['second_defensible', 'unreadable', 'fact_error', 'no_source']
export const ISSUE_TYPES = [...FLAG_TYPES, 'note']
export const AUDITORS = ['a', 'b']

/** Problems with one auditor file against the packet's item ids; [] when valid. */
export function validateAudit(doc, ids) {
  const errs = []
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return ['not a JSON object keyed by item id']
  const want = new Set(ids)
  for (const id of want) if (!(id in doc)) errs.push(`${id}: missing`)
  for (const [id, v] of Object.entries(doc)) {
    if (!want.has(id)) { errs.push(`${id}: not an item of this packet`); continue }
    if (!v || typeof v !== 'object') { errs.push(`${id}: not an object`); continue }
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
 * index: { packet, items: [{ id, cohort, passage }] }; audits: { a: doc, b: doc }.
 * Returns { items: N, flagged: [{ id, cohort, passage, reasons }], heldPassages: [{ cohort, passage, items, flagged }] }.
 */
export function scorePacket(index, audits) {
  const ids = (index?.items ?? []).map(i => i.id)
  if (!ids.length) throw new AuditError(`${index?.packet ?? '?'}: index holds zero items`)
  if (new Set(ids).size !== ids.length) throw new AuditError(`${index.packet}: duplicate item ids in index`)
  for (const k of AUDITORS) {
    if (!audits?.[k]) throw new AuditError(`${index.packet}: audit-${k}.json missing`)
    const errs = validateAudit(audits[k], ids)
    if (errs.length) throw new AuditError(`${index.packet}: audit-${k}.json malformed (${errs.length}):\n  ${errs.slice(0, 15).join('\n  ')}`)
  }
  const flagged = []
  for (const it of index.items) {
    const reasons = []
    for (const k of AUDITORS) {
      const v = audits[k][it.id]
      if (v.key_verified === false) reasons.push(`${k}: key not verified`)
      for (const x of v.issues) if (FLAG_TYPES.includes(x.type)) reasons.push(`${k}: ${x.type}: ${x.detail}`)
    }
    if (reasons.length) flagged.push({ id: it.id, cohort: it.cohort, passage: it.passage, reasons })
  }
  const heldKeys = new Set(flagged.map(f => `${f.cohort}|${f.passage}`))
  const heldPassages = [...heldKeys].map(k => {
    const [cohort, passage] = k.split('|')
    const items = index.items.filter(i => i.cohort === cohort && i.passage === passage).map(i => i.id)
    return { cohort, passage, items, flagged: flagged.filter(f => f.cohort === cohort && f.passage === passage).map(f => f.id) }
  })
  return { items: ids.length, flagged, heldPassages }
}

/** packets: [{ index, audits }] -> totals plus per-cohort counts. Throws on the first packet that cannot be scored. */
export function scoreAll(packets) {
  if (!packets.length) throw new AuditError('zero packets: nothing to score')
  const out = { items: 0, packets: packets.length, flagged: [], heldPassages: [], perCohort: {} }
  for (const p of packets) {
    const s = scorePacket(p.index, p.audits)
    out.items += s.items
    out.flagged.push(...s.flagged)
    out.heldPassages.push(...s.heldPassages)
    for (const it of p.index.items) {
      const c = (out.perCohort[it.cohort] ??= { items: 0, passages: new Set(), flaggedItems: 0, heldPassages: 0, heldItems: 0 })
      c.items++; c.passages.add(it.passage)
    }
  }
  for (const f of out.flagged) out.perCohort[f.cohort].flaggedItems++
  for (const h of out.heldPassages) { out.perCohort[h.cohort].heldPassages++; out.perCohort[h.cohort].heldItems += h.items.length }
  for (const c of Object.values(out.perCohort)) c.passages = c.passages.size
  return out
}
