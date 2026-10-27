/** @jest-environment node */
/**
 * Blind-only science runs (owner rule 2026-10-27, REGISTER §5 "OWNER RULE CHANGE"): drawing and release, the pure
 * halves in scripts/study-bank/autonomy-core.mjs.
 *
 * BREAK-TESTED 2026-10-27 (each revert failed the named test; restored after):
 *   simulateQueue's blind-only branch removed         -> "draw-next draws act/science and map/science blind-only"
 *   commandForRun's mark() made the identity          -> "draw-next draws ... blind-only" (command carries the marker)
 *   entryRunId ignoring entry.blindOnly               -> "old-rule draw-next marks a blind-only entry"
 *   simulateQueue's held skip removed                 -> "a held cohort is not drawn in level-aware mode"
 *   planScienceRelease's blindBar hold removed        -> "the pilot's pre-registered 35% bar holds the release"
 *   planScienceRelease's uncleared refusal removed    -> "refuses a staged row the graders did not clear"
 *   buildEvidence's blind-only count removed          -> "a blind-only row is counted apart from unanswered rows"
 */
import {
  BLIND_ONLY_MARKER as CORE_MARKER, isBlindOnlyRun as coreIsBlindOnly, isBlindOnlySection, withBlindOnlyMarker,
  entryRunId, simulateQueue, commandForRun, cohortHeld, planScienceRelease, blindScore, idsUnder, shapeOfRun,
  buildEvidence, RefusalError,
} from '../../../../scripts/study-bank/autonomy-core.mjs'
import { BLIND_ONLY_MARKER, isBlindOnlyRun } from '@/lib/study/item-review'
import { readFileSync, existsSync } from 'node:fs'

const DIR = `${process.cwd()}/scripts/study-bank/`

describe('the marker', () => {
  it('is one string in the route and in the scripts', () => {
    expect(CORE_MARKER).toBe(BLIND_ONLY_MARKER)
    for (const id of ['x-full1-blindonly-cofounder-2026-10-27', 'act-sci-v5a-spot-cofounder-2026-10-27', 'blindonly-x', 'x-blindonly']) {
      expect(coreIsBlindOnly(id)).toBe(isBlindOnlyRun(id))
    }
    expect(isBlindOnlyRun('x-full1-blindonly-cofounder-2026-10-27')).toBe(true)
    expect(isBlindOnlyRun('actreadingv8a-bridge1-cofounder-2026-10-27')).toBe(false)
  })
  it('is inserted before -cofounder- and keeps the run shape readable', () => {
    const id = withBlindOnlyMarker('actsciencev5b-full1-cofounder-2026-10-28')
    expect(id).toBe('actsciencev5b-full1-blindonly-cofounder-2026-10-28')
    expect(shapeOfRun(id)).toBe('full')
    expect(withBlindOnlyMarker(id)).toBe(id)
    expect(() => withBlindOnlyMarker('no-anchor')).toThrow(RefusalError)
  })
  it('science sections only', () => {
    expect(isBlindOnlySection('act/science/*')).toBe(true)
    expect(isBlindOnlySection('map/science/multiple_choice')).toBe(true)
    expect(isBlindOnlySection('act/reading/*')).toBe(false)
    expect(isBlindOnlySection('map/reading/x')).toBe(false)
  })
})

describe('drawing', () => {
  const strata = new Map([
    ['act/science/*', [{ method: 'm', units: [] }]],
    ['map/science/multiple_choice', [{ method: 'p', units: [] }]],
    ['act/reading/*', [{ method: 'r', units: [] }]],
  ])
  const batch = (i: number, cohort: string, stratum: string, extra = {}) => ({
    idx: i, cohort, stratum, method: stratum.startsWith('act/science') ? 'm' : stratum.startsWith('map') ? 'p' : 'r', tool: 'item',
    entry: { cohort, domain: 'Interpretation of Data:3,Scientific Investigation:2', family: stratum.split('/')[0] },
    family: stratum.split('/')[0], waiting: 40, drawn: false, old: { runs: 1, items: 6 }, runsSoFar: 0,
    groups: [{ id: `${cohort}:p1`, size: 6 }, { id: `${cohort}:p2`, size: 6 }, { id: `${cohort}:p3`, size: 5 }], ...extra,
  })

  it('draw-next draws act/science and map/science blind-only, with the marker in the run id', () => {
    const batches = [
      batch(0, 'act-reading-v8a', 'act/reading/*'),
      batch(1, 'act-science-v5b', 'act/science/*'),
      batch(2, 'map-science-pilot', 'map/science/multiple_choice', { groups: [], waiting: 30 }),
    ]
    const sim = simulateQueue({ strata, batches, depth: new Map([['act/reading', 4], ['act/science', 3], ['map/science', 0]]), prioritySections: ['act/reading'] })
    const by = (c: string) => sim.runs.find((r: { batches: { cohort: string }[] }) => r.batches[0].cohort === c)
    expect(by('act-reading-v8a')?.blindOnly).toBeUndefined()
    expect(by('act-reading-v8a')).toBeDefined()
    expect(by('act-science-v5b')).toMatchObject({ blindOnly: true, shape: 'full', items: 17 })
    expect(by('map-science-pilot')).toMatchObject({ blindOnly: true, shape: 'full', items: 30 })

    const runCount = new Map<string, number>([['act-science-v5b', 0], ['map-science-pilot', 0], ['act-reading-v8a', 0]])
    const cmd = (c: string) => commandForRun(by(c), { batches, runCount, reviewer: 'R', date: '2026-10-28' })
    expect(cmd('act-science-v5b')).toContain(' R actsciencev5b-full1-blindonly-cofounder-2026-10-28')
    expect(cmd('act-science-v5b')).toContain('DRAW_GROUP=act-science-v5b:p1,act-science-v5b:p2,act-science-v5b:p3')
    expect(cmd('map-science-pilot')).toMatch(/mapsciencepilot-full1-blindonly-cofounder-2026-10-28$/)
    expect(cmd('act-reading-v8a')).not.toContain(CORE_MARKER)
  })

  it('a blind-only run adds no level evidence, so the stratum never pools on his blind picks', () => {
    const batches = Array.from({ length: 8 }, (_, i) => batch(i, `act-science-x${i}`, 'act/science/*'))
    const sim = simulateQueue({ strata, batches, depth: new Map([['act/science', 10]]) })
    expect(sim.runs.every((r: { blindOnly?: boolean; shape: string }) => r.blindOnly && r.shape === 'full')).toBe(true)
  })

  it('a held cohort is not drawn in level-aware mode', () => {
    expect(cohortHeld([{ upTo: 0 }], 0)).toBe(true)
    expect(cohortHeld([{ upTo: 0 }, {}], 0)).toBe(false)
    expect(cohortHeld([], 0)).toBe(false)
    const batches = [batch(0, 'act-science-v5b', 'act/science/*', { held: true }), batch(1, 'act-reading-v8a', 'act/reading/*')]
    const sim = simulateQueue({ strata, batches, depth: new Map() })
    expect(sim.held).toEqual(['act-science-v5b'])
    expect(sim.runs.map((r: { batches: { cohort: string }[] }) => r.batches[0].cohort)).toEqual(['act-reading-v8a'])
  })

  it('old-rule draw-next marks a blind-only entry', () => {
    const e = { cohort: 'map-science-v1-life', blindOnly: true, runId: 'map-sci-v1-life-spot-cofounder-{date}' }
    expect(entryRunId(e, 1, '2026-10-28')).toBe('map-sci-v1-life-spot-blindonly-cofounder-2026-10-28')
    expect(entryRunId({ ...e, blindOnly: undefined }, 1, '2026-10-28')).toBe('map-sci-v1-life-spot-cofounder-2026-10-28')
  })

  it('every science entry in cofounder-queue.json is blind-only', () => {
    const Q = JSON.parse(readFileSync(DIR + 'cofounder-queue.json', 'utf8'))
    const sci = Q.queue.filter((e: { cohort: string }) => /^(act|map)-science-/.test(e.cohort))
    expect(sci.length).toBeGreaterThan(0)
    for (const e of sci) expect(e.blindOnly).toBe(true)
    for (const e of Q.queue.filter((x: { cohort: string }) => !/^(act|map)-science-/.test(x.cohort))) expect(e.blindOnly).toBeUndefined()
  })

  it('a blind-only row is counted apart from unanswered rows and is not evidence', () => {
    const items = new Map([['i1', { family: 'map', section: 'science', task: 'multiple_choice', cohort: 'map-science-pilot', content_sha: 's' }]])
    const ev = buildEvidence({ reviews: [{ id: 'r1', item_id: 'i1', run_id: 'x-full1-blindonly-cofounder-d', reviewer_kind: 'human', blind_at: 't', verdict: null, item_sha: 's' }], items, ledger: new Map(), methodOf: () => 'p' })
    expect(ev.counts.blind_only).toBe(1)
    expect(ev.counts.unanswered).toBe(0)
    expect(ev.counts.evidence).toBe(0)
  })
})

describe('science release', () => {
  const staged = (n: number, prefix = 'MSP-L') => Array.from({ length: n }, (_, i) => ({ id: `row${i}`, verified: false, archived: false, qid: `${prefix}-${String(i + 1).padStart(2, '0')}` }))
  const rows = (hits: number, n: number) => Array.from({ length: n }, (_, i) => ({ item_id: `row${i}`, blind_at: 't', key_slot: 'ABCD'[i % 4], blind_pick: i < hits ? 'ABCD'[i % 4] : 'ABCD'[(i + 1) % 4], reviewer_kind: 'human' }))
  const pilotCfg = { qid: 'draft.qid', blindBar: { maxPct: 35, basis: 'pilot prereg' } }
  const s4 = staged(4)
  const cleared = new Set(s4.map(r => r.qid))

  it('releases every staged, cleared row on a closed blind-only run, verdicts unread', () => {
    const p = planScienceRelease({ cohort: 'map-science-pilot', cfg: pilotCfg, staged: s4, cleared, dropped: new Set(), runRows: rows(1, 4) })
    expect(p.refusals).toEqual([])
    expect(p.hold).toBeNull()
    expect(p.release).toEqual(['row0', 'row1', 'row2', 'row3'])
    expect(p.blind).toEqual({ n: 4, hits: 1, pct: 25, controlPct: 25 })
  })
  it("the pilot's pre-registered 35% bar holds the release", () => {
    const p = planScienceRelease({ cohort: 'map-science-pilot', cfg: pilotCfg, staged: s4, cleared, dropped: new Set(), runRows: rows(2, 4) })
    expect(p.hold).toMatch(/50\.0% exceeds the pre-registered 35%/)
    expect(p.release).toEqual([])
  })
  it('no bar where the prereg set none: the blind number is reported, never decides', () => {
    const p = planScienceRelease({ cohort: 'c', cfg: { qid: 'draft.qid', blindBar: null }, staged: s4, cleared, dropped: new Set(), runRows: rows(4, 4) })
    expect(p.hold).toBeNull()
    expect(p.release).toHaveLength(4)
  })
  it('refuses a staged row the graders did not clear', () => {
    const p = planScienceRelease({ cohort: 'c', cfg: pilotCfg, staged: s4, cleared: new Set([...cleared].slice(0, 3)), dropped: new Set(), runRows: rows(0, 4) })
    expect(p.refusals.join()).toMatch(/1 staged row\(s\) not on the cleared list/)
    expect(p.release).toEqual([])
  })
  it('refuses an open run, a cleared-and-dropped id, a missing prerequisite and a blocker', () => {
    const open = rows(0, 4); open[3].blind_at = null as unknown as string
    expect(planScienceRelease({ cohort: 'c', cfg: pilotCfg, staged: s4, cleared, dropped: new Set(), runRows: open }).refusals.join()).toMatch(/not closed/)
    expect(planScienceRelease({ cohort: 'c', cfg: pilotCfg, staged: s4, cleared, dropped: new Set(['MSP-L-01']), runRows: rows(0, 4) }).refusals.join()).toMatch(/both cleared and dropped/)
    expect(planScienceRelease({ cohort: 'c', cfg: { ...pilotCfg, after: ['map-science-pilot'] }, staged: s4, cleared, dropped: new Set(), runRows: rows(0, 4), released: new Map([['map-science-pilot', false]]) }).refusals.join()).toMatch(/waits for map-science-pilot/)
    const b = planScienceRelease({ cohort: 'act-science-v5b', cfg: { blocker: 'no agent rule' }, staged: s4, cleared, dropped: new Set(), runRows: rows(0, 4) })
    expect(b.release).toEqual([]); expect(b.refusals.join()).toMatch(/no agent rule/)
    expect(planScienceRelease({ cohort: 'c', cfg: null, staged: s4, cleared, dropped: new Set(), runRows: rows(0, 4) }).refusals.join()).toMatch(/no science-release.json entry/)
  })
  it('blindScore derives the control from the deal, not a literal', () => {
    expect(blindScore([{ key_slot: 'A', blind_pick: 'A' }, { key_slot: 'A', blind_pick: 'B' }, { key_slot: 'B', blind_pick: 'C' }]).controlPct).toBeCloseTo(66.67, 1)
  })
})

describe('science-release.json matches the records on disk', () => {
  const S = JSON.parse(readFileSync(DIR + 'science-release.json', 'utf8'))
  const Q = JSON.parse(readFileSync(DIR + 'cofounder-queue.json', 'utf8'))
  it('names every science cohort in the queue', () => {
    for (const e of Q.queue.filter((x: { blindOnly?: boolean }) => x.blindOnly)) expect(S.cohorts[e.cohort]).toBeDefined()
  })
  it('every releasable entry points at grades and a cleared list that exist and do not overlap its drops', () => {
    for (const [c, cfg] of Object.entries(S.cohorts) as [string, { blocker?: string; cleared: string; qidPrefix?: string; grades: string[]; dropped: { file: string; keys: string[] }[] }][]) {
      if (cfg.blocker) continue
      for (const g of cfg.grades) expect(existsSync(DIR + g)).toBe(true)
      const cl = (JSON.parse(readFileSync(DIR + cfg.cleared, 'utf8')) as string[]).filter(q => !cfg.qidPrefix || q.startsWith(cfg.qidPrefix))
      expect(cl.length).toBeGreaterThan(0)
      const dropped = new Set<string>()
      for (const d of cfg.dropped) for (const q of idsUnder(JSON.parse(readFileSync(DIR + d.file, 'utf8')), d.keys)) dropped.add(q)
      // Every listed dropped key is present (idsUnder throws otherwise); a
      // cohort may legitimately have no drops at all, so size is not asserted.
      for (const d of cfg.dropped) {
        const doc = JSON.parse(readFileSync(DIR + d.file, 'utf8'))
        for (const k of d.keys) expect(doc).toHaveProperty(k)
      }
      expect(cl.filter(q => dropped.has(q))).toEqual([])
      expect(c).toMatch(/^(map|act)-science-/)
      // ACT: cleared + dropped is exactly the cohort, so no staged row is
      // left off both lists (planScienceRelease would refuse the cohort).
      if (c.startsWith('act-science-')) {
        const batch = JSON.parse(readFileSync(DIR + c + '.batch.json', 'utf8')) as { id: string }[]
        expect(new Set([...cl, ...dropped])).toEqual(new Set(batch.map(i => i.id)))
      }
    }
  })
})
