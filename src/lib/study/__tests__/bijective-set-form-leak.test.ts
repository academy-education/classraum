/** @jest-environment node */
/**
 * Two items from one bijective set must never share a form.
 *
 * Verbal items are banked in sets: four (ISEE) or five (SSAT) items
 * sharing ONE option pool, where each option is the key of exactly one
 * item. That construction is what makes an options-only attack
 * impossible — no option property can correlate with correctness,
 * because every option is a real key somewhere.
 *
 * It also means the items LEAK EACH OTHER. A candidate who answers
 * three of a set confidently gets the fourth by elimination, since each
 * option is used exactly once. The set carries less information than
 * its item count, and the strongest candidates gain the most.
 *
 * Nothing per-item sees this. Each item is sound; the defect is a
 * property of the FORM. The blind attack on isee-verbal-s4 scored
 * -5.2 — a comfortable pass — while this was true of every set in it.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { drawByPassage } from '../admission-tests'

type Row = { id: string; passageGroupId: string | null }

const set = (sid: string, n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${sid}-${i}`, passageGroupId: sid }))

describe('a drawn form never contains two items from one set', () => {
  it('takes at most one item per group', () => {
    // 12 sets of 4 — the shape of ssat-verbal-s6.
    const rows = Array.from({ length: 12 }, (_, i) => set(`SET-${i}`, 4)).flat()
    const picked = drawByPassage(rows, 12, 1)
    const per: Record<string, number> = {}
    for (const r of picked) per[r.passageGroupId!] = (per[r.passageGroupId!] ?? 0) + 1
    expect(picked).toHaveLength(12)
    expect(Math.max(...Object.values(per))).toBe(1)
  })

  it('leaves ungrouped rows alone', () => {
    // Math and legacy verbal carry no group id; each is its own group,
    // so the constraint must not thin them.
    const rows: Row[] = Array.from({ length: 60 }, (_, i) =>
      ({ id: `m${i}`, passageGroupId: null }))
    expect(drawByPassage(rows, 60, 1)).toHaveLength(60)
  })

  it('mixes grouped and ungrouped without dropping either', () => {
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => set(`S${i}`, 4)).flat(),  // 32 grouped
      ...Array.from({ length: 40 }, (_, i) => ({ id: `u${i}`, passageGroupId: null })),
    ]
    const picked = drawByPassage(rows, 40, 1)
    expect(picked).toHaveLength(40)
    const per: Record<string, number> = {}
    for (const r of picked) {
      if (!r.passageGroupId) continue
      per[r.passageGroupId] = (per[r.passageGroupId] ?? 0) + 1
    }
    expect(Object.values(per).every(n => n === 1)).toBe(true)
  })

  it('is actually wired into the draw, not just available', () => {
    /*
     * The tests above call drawByPassage directly, so they pass even if
     * assembleAdmissionSection never uses it — which is exactly how a
     * guard ends up existing and doing nothing. Pinned at the call site.
     */
    const src = readFileSync(join(process.cwd(), 'src/lib/study/assemble.ts'), 'utf8')
    expect(src).toMatch(/: drawByPassage\(ranked, block\.questions, 1\)/)
    expect(src).not.toMatch(/: ranked\.slice\(0, block\.questions\)/)
  })

  it('would notice the constraint being removed', () => {
    // Guard on the guard: at cap 4 the same input DOES double up, so the
    // test above is measuring the cap and not something incidental.
    const rows = Array.from({ length: 12 }, (_, i) => set(`SET-${i}`, 4)).flat()
    const loose = drawByPassage(rows, 12, 4)
    const per: Record<string, number> = {}
    for (const r of loose) per[r.passageGroupId!] = (per[r.passageGroupId!] ?? 0) + 1
    expect(Math.max(...Object.values(per))).toBeGreaterThan(1)
  })
})
