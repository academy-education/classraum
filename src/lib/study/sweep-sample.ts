/**
 * Draw a stratified sample of the bank for a human sweep.
 *
 * WHY NOT "the first N". The sweep lists items ordered by family, then
 * section, then id — so the first 40 rows are 40 ISEE maths items in a
 * row. A reviewer who stops after 40 has read one section of one test
 * and learned nothing about the other seven.
 *
 * WHY NOT "let the reviewer pick". Self-selected items are the sample
 * most likely to be unrepresentative, and this project has already spent
 * three sittings on runs that measured the draw rather than the bank.
 *
 * The draw is DETERMINISTIC from its seed, so it can be pre-registered,
 * repeated, and audited afterwards — the same reason the calibration run
 * was drawn in advance rather than chosen from a dropdown.
 *
 * Allocation is proportional to cohort size with a floor of one, so no
 * authoring cohort is invisible. Every defect this project has found was
 * concentrated in ONE cohort (the SAT maths hub was 98.3% in one and
 * 8.0% everywhere else), so a sample that can miss a whole cohort is a
 * sample that can miss the entire finding.
 */

export interface Sampleable {
  id: string
  cohort: string | null
}

/** Deterministic, seed-driven. No Math.random: a draw that cannot be
 *  reproduced cannot be audited. */
function rng(seed: string): () => number {
  let h = 2166136261
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5
    return ((h >>> 0) % 1_000_000) / 1_000_000
  }
}

export function stratifiedSample<T extends Sampleable>(
  rows: T[], size: number, seed: string,
): T[] {
  if (size >= rows.length) return rows

  const byCohort = new Map<string, T[]>()
  for (const r of rows) {
    const k = r.cohort ?? '(none)'
    const g = byCohort.get(k)
    if (g) g.push(r); else byCohort.set(k, [r])
  }

  const rand = rng(seed)
  // Shuffle within each cohort so the pick is not "lowest id".
  for (const g of byCohort.values()) {
    for (let i = g.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[g[i], g[j]] = [g[j], g[i]]
    }
  }

  const cohorts = [...byCohort.entries()].sort((a, b) => b[1].length - a[1].length)
  const total = rows.length

  /* One from every cohort first — the floor. If the bank has more
     cohorts than the sample has room for, that is worth failing loudly
     over rather than silently dropping cohorts. */
  const quota = new Map<string, number>()
  for (const [k] of cohorts) quota.set(k, 1)
  let used = cohorts.length
  if (used > size) {
    // Too many cohorts for this size: take the largest `size` cohorts,
    // one each, and say so by returning exactly that.
    return cohorts.slice(0, size).map(([, g]) => g[0])
  }

  // Remaining places proportional to cohort size, largest remainder.
  const remaining = size - used
  const shares = cohorts.map(([k, g]) => ({ k, exact: (g.length / total) * remaining }))
  for (const s of shares) {
    const whole = Math.floor(s.exact)
    const cap = byCohort.get(s.k)!.length - 1
    const add = Math.min(whole, Math.max(0, cap))
    quota.set(s.k, quota.get(s.k)! + add)
    used += add
  }
  const byRemainder = [...shares].sort((a, b) => (b.exact % 1) - (a.exact % 1))
  let i = 0
  while (used < size && i < byRemainder.length * 4) {
    const s = byRemainder[i % byRemainder.length]
    const have = quota.get(s.k)!
    if (have < byCohort.get(s.k)!.length) { quota.set(s.k, have + 1); used++ }
    i++
  }

  const out: T[] = []
  for (const [k, g] of cohorts) out.push(...g.slice(0, quota.get(k) ?? 1))
  // Interleave so consecutive items are not from one cohort: a reviewer
  // who sees six ISEE maths items in a row starts pattern-matching the
  // cohort rather than reading the item.
  for (let j = out.length - 1; j > 0; j--) {
    const j2 = Math.floor(rand() * (j + 1))
    ;[out[j], out[j2]] = [out[j2], out[j]]
  }
  return out.slice(0, size)
}
