import { PATHS, getPathsForTarget, getPathById, getPathTemplate } from '@/lib/study-path'

/*
 * SAT was one 18-stop path and TOEFL one 6-stop path; each section is
 * now its own path with its own finish line.
 *
 * The risk in a split like this is silent LOSS — a stop that belonged
 * to the old list and made it into neither new one. Nobody would
 * notice: the path would simply be one node shorter and the content
 * unreachable. These pin the properties that make that impossible.
 */
describe('study paths, split by section', () => {
  it('keeps every SAT stop, exactly once', () => {
    /*
     * The 18 ids of the original SAT path, written out. Deliberately a
     * literal rather than derived from PATHS — a test that recomputes
     * its expectation from the thing under test proves nothing.
     */
    const original = [
      'sat-diagnostic',
      'sat-rw-info-1', 'sat-rw-info-2',
      'sat-rw-craft-1', 'sat-rw-craft-2',
      'sat-rw-conventions-1', 'sat-rw-conventions-2',
      'sat-rw-expression', 'sat-rw-section',
      'sat-math-algebra-1', 'sat-math-algebra-2',
      'sat-math-advanced-1', 'sat-math-advanced-2',
      'sat-math-data', 'sat-math-geometry', 'sat-math-section',
      'sat-final-rw', 'sat-final-math',
    ]
    const now = getPathsForTarget('SAT').flatMap(p => p.nodes.map(n => n.id))
    expect(now.slice().sort()).toEqual(original.slice().sort())
    expect(new Set(now).size).toBe(now.length)
  })

  it('gives every path its own finish line', () => {
    // The point of the split: you can finish Math without touching
    // Reading. Each path must therefore END in a test, not a drill.
    for (const p of PATHS) {
      const last = p.nodes[p.nodes.length - 1]
      expect(['full_test', 'section_test']).toContain(last.kind)
    }
  })

  it('puts practice before every section test', () => {
    /*
     * The defect this whole change exists to fix: TOEFL Speaking and
     * Writing went straight to a full section with no warmup.
     */
    for (const p of PATHS) {
      const firstTest = p.nodes.findIndex(n => n.kind === 'section_test' || n.kind === 'full_test')
      expect(firstTest).toBeGreaterThan(0)
      expect(p.nodes.slice(0, firstTest).some(n => n.kind === 'practice' || n.kind === 'diagnostic')).toBe(true)
    }
  })

  it('never routes a non-MC section through practice mode', () => {
    /*
     * /api/study/practice/generate filters item_type='multiple_choice'.
     * A practice-mode node over Speaking or Writing would draw ZERO
     * items and fail silently, which is why those warmups run as short
     * full_test runs instead.
     */
    const nonMc = ['toefl-speaking', 'toefl-writing']
    for (const p of PATHS.filter(x => nonMc.includes(x.id))) {
      for (const n of p.nodes) expect(n.launchMode).not.toBe('practice')
    }
  })

  it('has unique path ids and resolves them', () => {
    const ids = PATHS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(getPathById(id)?.id).toBe(id)
    expect(getPathById('nope')).toBeNull()
  })

  it('splits SAT in two and TOEFL in four', () => {
    expect(getPathsForTarget('sat').map(p => p.id)).toEqual(['sat-rw', 'sat-math'])
    expect(getPathsForTarget('TOEFL')).toHaveLength(4)
    expect(getPathsForTarget(null)).toEqual([])
  })

  it('keeps getPathTemplate working for callers that want one path', () => {
    // StudyPathPromo, TestPrepPathCard and the repeat route still ask
    // for "the" path of a target; they get the first section.
    expect(getPathTemplate('SAT')?.id).toBe('sat-rw')
    expect(getPathTemplate('nope')).toBeNull()
  })
})
