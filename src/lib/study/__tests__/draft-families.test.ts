/** @jest-environment node */
/**
 * The draft-family allowlist in lib/study/ssat-draft.ts: SSAT reading (5
 * choices, unchanged) and MAP reading (4 choices). ssat-draft.test.ts pins
 * the SSAT behaviour and is deliberately left as it was; this file pins
 * what the generalisation added.
 * Contract: scripts/study-bank/SSAT-DRAFT-EDIT-CONTRACT.md.
 */
import {
  DRAFT_FAMILIES, draftFamilyOf, draftFamilyByKey, isDraftRow, validateItemEdit, planSave, planSkip, summarise,
  ssatContentHash, groupFamily, type DraftRow, type SaveRequest,
} from '@/lib/study/ssat-draft'

const GROUP = 'map-draft1-M1-P01'
const MAP_CHOICES = ['a pleased one', 'a doubtful one', 'an angry one', 'a puzzled one']
const CTX = { userId: 'admin-1', now: '2026-10-12T10:00:00.000Z' }

function mapRow(i: number, over: Partial<DraftRow> = {}): DraftRow {
  return {
    id: `m-${i}`, family: 'map', section: 'reading', cohort: 'map-reading-draft-1',
    verified: false, archived: false, passage_group_id: GROUP, content_sha: `sha-${i}`,
    item: {
      type: 'multiple_choice', passage: 'Ana fixed the gate.\n\nIt held.', prompt: `Q${i}`,
      choices: [...MAP_CHOICES], correct_answer: MAP_CHOICES[2], explanation: 'P2.',
      target_band: 'RIT 200-209', grade_target: 6,
    },
    verify_meta: { draft: { status: 'awaiting_edit', qc: { oo_hits: 2, risk: 'high' } } },
    ...over,
  }
}
const four = (f?: (i: number) => Partial<DraftRow>) => Array.from({ length: 4 }, (_, i) => mapRow(i, f?.(i)))
const editOf = (r: DraftRow, over: Record<string, unknown> = {}) => ({
  id: r.id, expectedSha: r.content_sha ?? null, prompt: r.item!.prompt!, choices: [...r.item!.choices!],
  correct_answer: r.item!.correct_answer!, explanation: r.item!.explanation!, ...over,
})
const req = (rows: DraftRow[], over: Partial<SaveRequest> = {}, edits?: SaveRequest['items']): SaveRequest =>
  ({ group: rows[0]?.passage_group_id ?? GROUP, items: edits ?? rows.map(r => editOf(r)), ...over })

describe('DRAFT_FAMILIES', () => {
  it('is exactly the two allowlisted families, frozen', () => {
    expect(DRAFT_FAMILIES.map(f => [f.key, f.family, f.section, f.cohortPrefix, f.cohortLike, f.choiceCount])).toEqual([
      ['ssat-reading', 'ssat', 'reading', 'ssat-reading-draft-', 'ssat-reading-draft-%', 5],
      ['map-reading', 'map', 'reading', 'map-reading-draft-', 'map-reading-draft-%', 4],
    ])
    expect(Object.isFrozen(DRAFT_FAMILIES)).toBe(true)
    expect(Object.isFrozen(DRAFT_FAMILIES[1])).toBe(true)
    expect(draftFamilyByKey('map-reading')?.choiceCount).toBe(4)
    expect(draftFamilyByKey('isee-reading')).toBeNull()
  })
})

describe('isDraftRow / draftFamilyOf across families', () => {
  it('accepts a MAP draft row and names its family', () => {
    expect(isDraftRow(mapRow(0))).toBe(true)
    expect(draftFamilyOf(mapRow(0))?.key).toBe('map-reading')
  })
  it.each([
    ['MAP family with the SSAT prefix', { cohort: 'ssat-reading-draft-1' }],
    ['MAP prefix not at the start', { cohort: 'x-map-reading-draft-1' }],
    ['MAP non-draft cohort', { cohort: 'map-reading-pilot-1' }],
    ['MAP other section', { section: 'language_usage' }],
    ['MAP verified', { verified: true }],
    ['MAP archived', { archived: true }],
    ['SSAT family with the MAP prefix', { family: 'ssat', cohort: 'map-reading-draft-1' }],
    ['unlisted family with a draft prefix', { family: 'isee', cohort: 'map-reading-draft-1' }],
  ])('refuses %s', (_n, over) => expect(isDraftRow({ ...mapRow(0), ...over })).toBe(false))
})

describe('validateItemEdit per family', () => {
  const ok4 = { prompt: 'Q?', choices: ['aa', 'bb', 'cc', 'dd'], correct_answer: 'bb', explanation: '' }
  it('4 choices pass at MAP width and fail at the SSAT default', () => {
    expect(validateItemEdit(ok4, 4)).toEqual({ errors: [], warnings: [] })
    expect(validateItemEdit(ok4).errors.join()).toMatch(/exactly 5/)
  })
  it('5 choices fail at MAP width', () => {
    expect(validateItemEdit({ ...ok4, choices: [...ok4.choices, 'ee'] }, 4).errors.join()).toMatch(/exactly 4/)
  })
})

describe('planSave / planSkip on MAP', () => {
  it('saves a 4-choice MAP passage, scoped to the MAP family, never verified/archived', () => {
    const rows = four()
    const edits = rows.map(r => editOf(r))
    edits[1] = { ...edits[1], choices: [...MAP_CHOICES.slice(0, 3), 'a weary one'] }
    const plan = planSave(rows, req(rows, {}, edits), CTX)
    if (!plan.ok) throw new Error(plan.error)
    expect(plan.changed).toBe(1)
    for (const u of plan.updates) {
      expect(u.scope.key).toBe('map-reading')
      expect(u.scope.cohortLike).toBe('map-reading-draft-%')
      expect(u.patch).not.toHaveProperty('verified')
      expect(u.patch).not.toHaveProperty('archived')
    }
    const u1 = plan.updates.find(u => u.id === 'm-1')!
    expect(u1.patch.content_hash).toBe(ssatContentHash(u1.patch.item!))
    expect(u1.patch.item).toMatchObject({ target_band: 'RIT 200-209', grade_target: 6 })
  })
  it('refuses 5 choices on a MAP passage (400, per item)', () => {
    const rows = four()
    const edits = rows.map(r => editOf(r))
    edits[2] = { ...edits[2], choices: [...MAP_CHOICES, 'a fifth one'] }
    const plan = planSave(rows, req(rows, {}, edits), CTX)
    expect(plan).toMatchObject({ ok: false, status: 400 })
    if (!plan.ok) expect(Object.keys(plan.details!)).toEqual(['m-2'])
  })
  it('SSAT is unchanged: a 4-choice save on an SSAT draft is still refused', () => {
    const rows = four(() => ({ family: 'ssat', cohort: 'ssat-reading-draft-1' }))
    expect(planSave(rows, req(rows), CTX)).toMatchObject({ ok: false, status: 400 })
  })
  it('refuses a group that mixes SSAT and MAP drafts (403), on save and skip', () => {
    const rows = four(i => (i === 3 ? { family: 'ssat', cohort: 'ssat-reading-draft-1' } : {}))
    expect(rows.every(isDraftRow)).toBe(true)
    expect(planSave(rows, req(rows), CTX)).toMatchObject({ ok: false, status: 403 })
    expect(planSkip(rows, GROUP)).toMatchObject({ ok: false, status: 403 })
    expect(groupFamily(rows)).toBeNull()
  })
  it('skip is scoped to MAP and writes status only', () => {
    const plan = planSkip(four(), GROUP)
    if (!plan.ok) throw new Error(plan.error)
    for (const u of plan.updates) {
      expect(u.scope.key).toBe('map-reading')
      expect(Object.keys(u.patch)).toEqual(['verify_meta'])
    }
  })
})

describe('summarise labels the family', () => {
  it('gives each passage its family key and label', () => {
    const ssat = Array.from({ length: 6 }, (_, i) => mapRow(i + 10, { family: 'ssat', cohort: 'ssat-reading-draft-1', passage_group_id: 'draft1-D1-P01' }))
    const s = summarise([...ssat, ...four()])
    expect(Object.fromEntries(s.map(p => [p.group, [p.family, p.familyLabel, p.items]]))).toEqual({
      'draft1-D1-P01': ['ssat-reading', 'SSAT reading', 6],
      [GROUP]: ['map-reading', 'MAP reading', 4],
    })
  })
})
