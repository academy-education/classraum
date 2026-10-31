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

/** widths: option count per sample row; segments: [[lo, hi), ...]; shuffle: array -> shuffled copy.
 * fixed (optional): per row, a slot the row MUST keep (an error-identification item whose letters are printed in
 * its sentence, see isLabelledItem). A fixed row takes its own slot and is left out of the deal; the rest are dealt
 * flat as before. */
export function dealSlots(widths, segments, shuffle, fixed = []) {
  const slots = new Array(widths.length)
  for (const [lo, hi] of segments) {
    const byWidth = new Map()
    for (let i = lo; i < hi; i++) {
      if (fixed[i]) { slots[i] = fixed[i]; continue }
      if (!byWidth.has(widths[i])) byWidth.set(widths[i], []); byWidth.get(widths[i]).push(i)
    }
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

/* LABELLED SEGMENTS (iTEP Grammar Part 2, error identification), added 2026-10-31. The passage prints
 * "[A: set] up a tent [B: behind] ..." and the choices are those segments IN ORDER, so the letter in the sentence IS
 * the option's position. Reordering the options for a review run would make the reveal's A..D disagree with the
 * sentence's A..D. Mirrors hasLabelledSegments in src/lib/study/labelled-segments.ts exactly (structural: one marker
 * per choice, lettered A, B, C... in order, each marker's text equal to its choice); a parity test pins the two. */
const MARKER = /\[([A-F]):\s*([^\]\n]+?)\s*\]/g
const choiceText = c => typeof c === 'string' ? c : (c && typeof c === 'object' && typeof c.text === 'string' ? c.text : '')
export function isLabelledItem(item) {
  const choices = item?.choices ?? []
  if (!item?.passage || choices.length < 2) return false
  const segs = [...String(item.passage).matchAll(MARKER)].map(m => ({ label: m[1], text: m[2] }))
  if (segs.length !== choices.length) return false
  return segs.every((s, i) => s.label === String.fromCharCode(65 + i) && s.text === choiceText(choices[i]).trim())
}
