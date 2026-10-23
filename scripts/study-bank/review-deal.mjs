/**
 * review-deal.mjs — the key-slot deal of draw-review-run.mjs, PURE so it can be tested.
 *
 * Keys are dealt flat within each segment AND within each option width (a five-wide item cannot take a slot from a
 * four-wide deal, and the two widths are different instruments). A segment is one cohort/domain of a normal run,
 * so each cohort's blind control comes from its own flat spread (2026-08-11 sweep).
 *
 * POOLED runs (Amendment 3, L2: 2-3 items from each of up to 6 batches) are dealt as ONE segment. Dealt per cohort,
 * every 2-item cohort would get slots A,B — across six cohorts the key would never be C or D, a positional tell the
 * reviewer could learn inside one sitting. A 2-3 item cohort has no meaningful blind control anyway (Amendment 1
 * rule 3), so the run is the instrument.
 */
export const SLOTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/** widths: option count per sample row; segments: [[lo, hi), ...]; shuffle: array -> shuffled copy. */
export function dealSlots(widths, segments, shuffle) {
  const slots = new Array(widths.length)
  for (const [lo, hi] of segments) {
    const byWidth = new Map()
    for (let i = lo; i < hi; i++) { if (!byWidth.has(widths[i])) byWidth.set(widths[i], []); byWidth.get(widths[i]).push(i) }
    for (const [w, idxs] of byWidth) {
      const dealt = shuffle(idxs.map((_, i) => SLOTS[i % w]))
      idxs.forEach((sampleIdx, k) => { slots[sampleIdx] = dealt[k] })
    }
  }
  return slots
}

/** Segments for a run: per entry normally, the whole run when pooled. sizes: items per entry in run order. */
export function dealSegments(sizes, pooled) {
  const total = sizes.reduce((a, n) => a + n, 0)
  if (pooled) return [[0, total]]
  const out = []; let lo = 0
  for (const n of sizes) { out.push([lo, lo + n]); lo += n }
  return out
}

/** DRAW_COHORT: 'cr-v10' (one cohort) or 'a:3,b:3,c:2' (a pooled run with per-cohort quotas). */
export function parseDrawCohort(v) {
  if (!v) return { pooled: false, cohort: null, quotas: [] }
  if (!v.includes(':')) return { pooled: false, cohort: v.trim(), quotas: [] }
  const quotas = v.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(.+):(\d+)$/)
    if (!m || Number(m[2]) <= 0) throw new Error(`DRAW_COHORT entry "${s}" is not cohort:n`)
    return { cohort: m[1], size: Number(m[2]) }
  })
  if (new Set(quotas.map(q => q.cohort)).size !== quotas.length) throw new Error('DRAW_COHORT names a cohort twice')
  return { pooled: true, cohort: null, quotas }
}
