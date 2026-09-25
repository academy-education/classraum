/** @jest-environment node */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
/**
 * A passage draw must not re-serve passages it has already spent.
 *
 * FOUND IN PRODUCTION, 2026-09-21, from "students are running out of SSAT
 * tests". They were: a student's first four reading sections delivered
 * 40/40 fresh questions, then 36/40, then **2/40**, then 0/40. The third
 * test was 95% questions they had already answered.
 *
 * The cause was not the bank being thin. 138 items sat in 31 passages —
 * thirteen of six questions, seven of five, eleven smaller — and the draw
 * could only ever reach the thirteen. `drawByPassage` regrouped the rows
 * the caller had carefully ranked unseen-first and then sorted the GROUPS
 * by "full first, largest first". Size is a property of the bank and does
 * not change between sittings, so the same thirteen passages won every
 * draw for ever, and 56 items — 41% of the reading bank — were
 * unreachable in practice.
 *
 * Nothing failed. `drawByPassage` tops up to a full-length section from
 * whatever is left, so the section was always 40 questions long and
 * always on time. It was simply the same reading, again.
 *
 * These fixtures are shaped like the real bank because the defect only
 * appears when passage sizes VARY — a uniform fixture (which is what
 * every other test in this directory uses) cannot see it, which is why it
 * survived 982 passing tests.
 */
import { drawByPassage } from '../admission-tests'

type Row = { id: string; passageGroupId: string | null }

/** The live SSAT reading shape: 13x6, 7x5, 2x4, 3x3, 2x2, 4x1 = 138. */
function ssatShapedBank(): Row[] {
  const spec: Array<[number, number]> = [[13, 6], [7, 5], [2, 4], [3, 3], [2, 2], [4, 1]]
  const rows: Row[] = []
  let p = 0
  for (const [count, size] of spec) {
    for (let i = 0; i < count; i++, p++) {
      for (let j = 0; j < size; j++) rows.push({ id: `p${p}q${j}`, passageGroupId: `p${p}` })
    }
  }
  return rows
}

/** Replay successive sections the way assembleAdmissionSection does. */
function replay(rows: Row[], count: number, perPassage: number, forms: number) {
  const seen = new Set<string>()
  const out: { fresh: number; delivered: number }[] = []
  for (let f = 0; f < forms; f++) {
    const unseenFirst = [...rows.filter(r => !seen.has(r.id)), ...rows.filter(r => seen.has(r.id))]
    const picked = drawByPassage(unseenFirst, count, perPassage, r => !seen.has(r.id))
    out.push({ fresh: picked.filter(r => !seen.has(r.id)).length, delivered: picked.length })
    for (const r of picked) seen.add(r.id)
  }
  return out
}

describe('successive reading sections do not re-serve spent passages', () => {
  it('gives three clean SSAT reading sections from the live bank shape', () => {
    const forms = replay(ssatShapedBank(), 40, 6, 3)
    // Before the fix this was 40/40, 36/40, 2/40.
    for (const [i, f] of forms.entries()) {
      expect(`form ${i + 1}: ${f.delivered} delivered`).toBe(`form ${i + 1}: 40 delivered`)
      expect(`form ${i + 1}: ${f.fresh} fresh`).toBe(`form ${i + 1}: 40 fresh`)
    }
  })

  it('reaches the whole bank rather than stranding the smaller passages', () => {
    // 138 items; the old ordering could only ever deliver the 78 that sat
    // in six-question passages, however many sections the student sat.
    const rows = ssatShapedBank()
    const seen = new Set<string>()
    for (let f = 0; f < 6; f++) {
      const unseenFirst = [...rows.filter(r => !seen.has(r.id)), ...rows.filter(r => seen.has(r.id))]
      for (const r of drawByPassage(unseenFirst, 40, 6, x => !seen.has(x.id))) seen.add(r.id)
    }
    expect(seen.size).toBe(rows.length)
  })

  it('still prefers full passages while fresh ones are available', () => {
    // Fidelity must not be traded away for freshness: with everything
    // unseen, a six-question passage still beats a two-question one.
    const rows: Row[] = []
    for (let p = 0; p < 10; p++) {
      const size = p < 7 ? 6 : 2
      for (let j = 0; j < size; j++) rows.push({ id: `p${p}q${j}`, passageGroupId: `p${p}` })
    }
    const picked = drawByPassage(rows, 40, 6, () => true)
    const per: Record<string, number> = {}
    for (const r of picked) per[r.passageGroupId!] = (per[r.passageGroupId!] ?? 0) + 1
    expect(picked).toHaveLength(40)
    expect(Math.min(...Object.values(per))).toBeGreaterThanOrEqual(5)
  })

  it('is wired into the admission draw, not merely available', () => {
    // The guard that the previous fix of this shape lacked: the tests
    // above pass even if the assembler never passes a predicate.
    const src = readFileSync(join(process.cwd(), 'src/lib/study/assemble.ts'), 'utf8')
    expect(src).toMatch(/drawByPassage\(ranked, block\.questions, ITEMS_PER_PASSAGE\[p\.family\], fresh\)/)
    expect(src).toMatch(/const fresh = \(row: \{ id: string \}\) => !exposures\.has\(row\.id\)/)
  })
})
