/** @jest-environment node */
/**
 * Pure half of the SSAT draft edit screen (lib/study/ssat-draft.ts).
 * Contract: scripts/study-bank/SSAT-DRAFT-EDIT-CONTRACT.md.
 */
import {
  isDraftRow, ssatContentHash, validateItemEdit, mergeItem, changedFields, nextStatus,
  aggregateStatus, savedMeta, planSave, planSkip, summarise, isUniquelyLongest,
  type DraftRow, type SaveRequest,
} from '@/lib/study/ssat-draft'

const GROUP = 'draft-P01'
const CHOICES = ['a pleased one', 'a doubtful one', 'an angry one', 'a bored one', 'a puzzled one']

function row(i: number, over: Partial<DraftRow> = {}, meta: Record<string, unknown> = {}): DraftRow {
  return {
    id: `id-${i}`, family: 'ssat', section: 'reading', cohort: 'ssat-reading-draft-2026-10-11',
    verified: false, archived: false, passage_group_id: GROUP, content_sha: `sha-${i}`,
    item: {
      type: 'multiple_choice', difficulty: 'medium', passageGroupId: GROUP, graphic: null,
      passage: 'The mill stood by the river.\nIt was old.', prompt: `Q${i}: the author's attitude is`,
      choices: [...CHOICES], correct_answer: CHOICES[1], explanation: 'Line 2.',
      distractor_rationales: CHOICES.filter(c => c !== CHOICES[1]).map(c => ({ choice: c, reason: `no: ${c}` })),
    },
    verify_meta: { other: 'kept', draft: { status: 'awaiting_edit', qc: { oo_hits: 3, oo_notes: ['warm'], grader_flags: [], risk: 'high' }, ...meta } },
    ...over,
  }
}
const six = (f?: (i: number) => Partial<DraftRow>) => Array.from({ length: 6 }, (_, i) => row(i, f?.(i)))
const editOf = (r: DraftRow, over: Record<string, unknown> = {}) => ({
  id: r.id, expectedSha: r.content_sha ?? null, prompt: r.item!.prompt!, choices: [...r.item!.choices!],
  correct_answer: r.item!.correct_answer!, explanation: r.item!.explanation!, ...over,
})
const CTX = { userId: 'admin-1', now: '2026-10-11T10:00:00.000Z' }

describe('isDraftRow', () => {
  const base = row(0)
  it('accepts the contract shape', () => expect(isDraftRow(base)).toBe(true))
  it.each([
    ['verified', { verified: true }],
    ['verified null', { verified: null }],
    ['archived', { archived: true }],
    ['other cohort', { cohort: 'ssat-reading-wv6' }],
    ['prefix not at start', { cohort: 'x-ssat-reading-draft-1' }],
    ['null cohort', { cohort: null }],
    ['other family', { family: 'isee' }],
    ['other section', { section: 'verbal' }],
  ])('refuses %s', (_n, over) => expect(isDraftRow({ ...base, ...over })).toBe(false))
})

describe('ssatContentHash', () => {
  it('matches the insert path (insert-ssat-wv.mjs hashOf) on a pinned value', () => {
    // Computed by running the exact norm/hashOf lines from insert-ssat-wv.mjs.
    expect(ssatContentHash({
      passage: 'The  “Old” Mill\nstood here.', prompt: 'What is the mill’s age?',
      choices: ['Old', 'New ', 'Ancient', 'Recent', 'Unknown'],
    })).toBe('72a60759d3faf18b8f3e2b622620c748')
  })
  it('changes with choice order (the insert path does not sort)', () => {
    const a = ssatContentHash({ passage: 'p', prompt: 'q', choices: ['x', 'y'] })
    expect(ssatContentHash({ passage: 'p', prompt: 'q', choices: ['y', 'x'] })).not.toBe(a)
  })
})

describe('validateItemEdit', () => {
  const ok = { prompt: 'Q?', choices: ['aa', 'bb', 'cc', 'dd', 'ee'], correct_answer: 'bb', explanation: '' }
  it('passes a clean item with no warnings', () => expect(validateItemEdit(ok)).toEqual({ errors: [], warnings: [] }))
  it('needs exactly five choices', () => {
    expect(validateItemEdit({ ...ok, choices: ok.choices.slice(0, 4) }).errors.join()).toMatch(/exactly 5/)
    expect(validateItemEdit({ ...ok, choices: [...ok.choices, 'ff'] }).errors.join()).toMatch(/exactly 5/)
  })
  it('refuses an empty choice', () => expect(validateItemEdit({ ...ok, choices: ['aa', 'bb', ' ', 'dd', 'ee'] }).errors.join()).toMatch(/needs text/))
  it('refuses duplicate choices, ignoring case and spacing', () => {
    expect(validateItemEdit({ ...ok, choices: ['aa', 'bb', 'cc', 'dd', ' AA '] }).errors.join()).toMatch(/same/)
  })
  it('refuses a missing or foreign key', () => {
    expect(validateItemEdit({ ...ok, correct_answer: '' }).errors.join()).toMatch(/right answer/)
    expect(validateItemEdit({ ...ok, correct_answer: 'zz' }).errors.join()).toMatch(/right answer/)
  })
  it('refuses an empty stem', () => expect(validateItemEdit({ ...ok, prompt: '  ' }).errors.join()).toMatch(/question is empty/))
  it('WARNS (does not block) when the key is the uniquely longest choice', () => {
    const w = validateItemEdit({ ...ok, choices: ['aa', 'bbbbbbbb', 'cc', 'dd', 'ee'], correct_answer: 'bbbbbbbb' })
    expect(w.errors).toEqual([])
    expect(w.warnings.join()).toMatch(/longest/)
  })
  it('does not warn on a tie for longest', () => {
    expect(isUniquelyLongest(['aaaa', 'bbbb', 'c', 'd', 'e'], 'bbbb')).toBe(false)
    expect(isUniquelyLongest(['aaa', 'bbbb', 'c', 'd', 'e'], 'bbbb')).toBe(true)
  })
})

describe('mergeItem', () => {
  const stored = row(0).item!
  it('carries every key the edit does not own', () => {
    const out = mergeItem(stored, { prompt: 'new', choices: [...CHOICES], correct_answer: CHOICES[1], explanation: 'e' })
    expect(out).toMatchObject({ type: 'multiple_choice', difficulty: 'medium', passageGroupId: GROUP, graphic: null, passage: stored.passage })
    expect(out.prompt).toBe('new')
  })
  it('drops rationales for rewritten choices and for the new key; keeps the rest', () => {
    const choices = [...CHOICES]; choices[3] = 'a cheerful one'
    const out = mergeItem(stored, { prompt: 'q', choices, correct_answer: CHOICES[0], explanation: 'e' })
    expect(out.distractor_rationales).toEqual([
      { choice: CHOICES[1], reason: '' },
      { choice: CHOICES[2], reason: `no: ${CHOICES[2]}` },
      { choice: 'a cheerful one', reason: '' },
      { choice: CHOICES[4], reason: `no: ${CHOICES[4]}` },
    ])
  })
  it('sets the passage only when one is given', () => {
    const e = { prompt: 'q', choices: [...CHOICES], correct_answer: CHOICES[1], explanation: 'e' }
    expect(mergeItem(stored, e).passage).toBe(stored.passage)
    expect(mergeItem(stored, e, 'P2').passage).toBe('P2')
  })
  it('does not mutate the stored item', () => {
    const copy = JSON.parse(JSON.stringify(stored))
    mergeItem(stored, { prompt: 'zz', choices: ['1', '2', '3', '4', '5'], correct_answer: '1', explanation: 'e' }, 'P')
    expect(stored).toEqual(copy)
  })
  it('changedFields sees choice order and nothing else unchanged', () => {
    const e = { prompt: stored.prompt!, choices: [...CHOICES], correct_answer: CHOICES[1], explanation: stored.explanation! }
    expect(changedFields(stored, mergeItem(stored, e))).toEqual([])
    expect(changedFields(stored, mergeItem(stored, { ...e, choices: [...CHOICES].reverse() }))).toEqual(['choices'])
  })
})

describe('status transitions', () => {
  it('save always lands on edited', () => {
    for (const s of ['awaiting_edit', 'edited', 'skipped'] as const) expect(nextStatus(s, 'save')).toBe('edited')
  })
  it('skip: awaiting/skipped -> skipped; edited is refused', () => {
    expect(nextStatus('awaiting_edit', 'skip')).toBe('skipped')
    expect(nextStatus('skipped', 'skip')).toBe('skipped')
    expect(nextStatus('edited', 'skip')).toBeNull()
  })
  it('aggregate puts awaiting first', () => {
    expect(aggregateStatus(['edited', 'awaiting_edit'])).toBe('awaiting_edit')
    expect(aggregateStatus(['edited', 'skipped'])).toBe('edited')
    expect(aggregateStatus(['skipped'])).toBe('skipped')
  })
})

describe('savedMeta: original_item', () => {
  const stored = row(0).item!
  it('stores original_item when absent', () => {
    expect(savedMeta({ status: 'awaiting_edit' }, stored, CTX).original_item).toBe(stored)
  })
  it('never overwrites an existing original_item', () => {
    const orig = { prompt: 'first ever' }
    expect(savedMeta({ status: 'edited', original_item: orig }, stored, CTX).original_item).toBe(orig)
  })
  it('stamps editor, time, status; keeps qc', () => {
    const m = savedMeta({ status: 'awaiting_edit', qc: { risk: 'high' } }, stored, { ...CTX, note: ' fixed B ' })
    expect(m).toMatchObject({ status: 'edited', edited_by: 'admin-1', edited_at: CTX.now, edit_note: 'fixed B', qc: { risk: 'high' } })
  })
})

describe('planSave', () => {
  const req = (rows: DraftRow[], over: Partial<SaveRequest> = {}, edits?: SaveRequest['items']): SaveRequest =>
    ({ group: GROUP, items: edits ?? rows.map(r => editOf(r)), ...over })

  it('writes item + recomputed hash only on changed rows, meta on all, never verified/archived', () => {
    const rows = six()
    const edits = rows.map(r => editOf(r))
    edits[2] = { ...edits[2], choices: [...CHOICES.slice(0, 4), 'a thoughtful, warm one'] }
    const plan = planSave(rows, req(rows, {}, edits), CTX)
    if (!plan.ok) throw new Error(plan.error)
    expect(plan.changed).toBe(1)
    const u2 = plan.updates.find(u => u.id === 'id-2')!
    expect(u2.patch.item!.choices![4]).toBe('a thoughtful, warm one')
    expect(u2.patch.content_hash).toBe(ssatContentHash(u2.patch.item!))
    expect(u2.expectedSha).toBe('sha-2')
    const u0 = plan.updates.find(u => u.id === 'id-0')!
    expect(u0.patch.item).toBeUndefined()
    expect(u0.patch.content_hash).toBeUndefined()
    for (const u of plan.updates) {
      expect(Object.keys(u.patch).sort()).toEqual(expect.arrayContaining(['verify_meta']))
      expect(u.patch).not.toHaveProperty('verified')
      expect(u.patch).not.toHaveProperty('archived')
      expect(u.patch.verify_meta.other).toBe('kept')
      expect(u.patch.verify_meta.draft).toMatchObject({ status: 'edited', edited_by: 'admin-1', qc: { risk: 'high' } })
    }
    expect((u2.patch.verify_meta.draft as { original_item: unknown }).original_item).toEqual(rows[2].item)
  })

  it('keeps an existing original_item on a re-save', () => {
    const orig = { prompt: 'as first inserted' }
    const rows = six().map(r => ({ ...r, verify_meta: { draft: { status: 'edited', original_item: orig } } }))
    const edits = rows.map(r => editOf(r, { prompt: 'changed again' }))
    const plan = planSave(rows, req(rows, {}, edits), CTX)
    if (!plan.ok) throw new Error(plan.error)
    for (const u of plan.updates) expect((u.patch.verify_meta.draft as { original_item: unknown }).original_item).toBe(orig)
  })

  it('a passage edit goes to every item, and must include every item', () => {
    const rows = six()
    const plan = planSave(rows, req(rows, { passage: 'A new passage.' }), CTX)
    if (!plan.ok) throw new Error(plan.error)
    expect(plan.changed).toBe(6)
    for (const u of plan.updates) expect(u.patch.item!.passage).toBe('A new passage.')
    const partial = planSave(rows, req(rows, { passage: 'x' }, rows.slice(0, 3).map(r => editOf(r))), CTX)
    expect(partial).toMatchObject({ ok: false, status: 400 })
    expect(planSave(rows, req(rows, { passage: '  ' }), CTX)).toMatchObject({ ok: false, status: 400 })
  })

  it('refuses invalid items with per-item details', () => {
    const rows = six()
    const edits = rows.map(r => editOf(r))
    edits[1] = { ...edits[1], choices: CHOICES.slice(0, 4) }
    const plan = planSave(rows, req(rows, {}, edits), CTX)
    expect(plan).toMatchObject({ ok: false, status: 400 })
    if (plan.ok) return
    expect(Object.keys(plan.details!)).toEqual(['id-1'])
  })

  it('refuses a group containing ANY non-draft row (403), and touches nothing', () => {
    for (const over of [{ verified: true }, { archived: true }, { cohort: 'ssat-reading-wv6' }, { family: 'sat' }]) {
      const rows = six(i => (i === 4 ? over : {}))
      expect(planSave(rows, req(rows), CTX)).toMatchObject({ ok: false, status: 403 })
      expect(planSkip(rows, GROUP)).toMatchObject({ ok: false, status: 403 })
    }
  })

  it('refuses an item id that is not in the group (403), a duplicate id, no items, no group', () => {
    const rows = six()
    expect(planSave(rows, req(rows, {}, [{ ...editOf(rows[0]), id: 'live-row' }]), CTX)).toMatchObject({ ok: false, status: 403 })
    expect(planSave(rows, req(rows, {}, [editOf(rows[0]), editOf(rows[0])]), CTX)).toMatchObject({ ok: false, status: 400 })
    expect(planSave(rows, req(rows, {}, []), CTX)).toMatchObject({ ok: false, status: 400 })
    expect(planSave(rows, req(rows, { group: '' }), CTX)).toMatchObject({ ok: false, status: 400 })
    expect(planSave([], req([]), CTX)).toMatchObject({ ok: false, status: 404 })
  })
})

describe('planSkip', () => {
  it('sets status skipped only: no item, no hash, no verified/archived, qc and other meta kept', () => {
    const plan = planSkip(six(), GROUP)
    if (!plan.ok) throw new Error(plan.error)
    expect(plan.updates).toHaveLength(6)
    for (const u of plan.updates) {
      expect(Object.keys(u.patch)).toEqual(['verify_meta'])
      expect(u.patch.verify_meta.other).toBe('kept')
      expect(u.patch.verify_meta.draft).toEqual({ status: 'skipped', qc: { oo_hits: 3, oo_notes: ['warm'], grader_flags: [], risk: 'high' } })
    }
  })
  it('refuses to skip an edited passage', () => {
    const rows = six().map(r => ({ ...r, verify_meta: { draft: { status: 'edited' } } }))
    expect(planSkip(rows, GROUP)).toMatchObject({ ok: false, status: 409 })
  })
})

describe('summarise', () => {
  it('groups, counts high risk, orders awaiting first, and ignores non-draft rows', () => {
    const a = six()
    const b = Array.from({ length: 6 }, (_, i) => row(i + 10, { passage_group_id: 'draft-P02' }, { status: 'edited' }))
      .map(r => ({ ...r, verify_meta: { draft: { status: 'edited', qc: { risk: 'low' } } } }))
    const stray = row(99, { passage_group_id: 'live-group', verified: true })
    const s = summarise([...b, stray, ...a])
    expect(s.map(p => p.group)).toEqual([GROUP, 'draft-P02'])
    expect(s[0]).toMatchObject({ status: 'awaiting_edit', items: 6, highRisk: 6, title: 'The mill stood by the river.' })
    expect(s[1]).toMatchObject({ status: 'edited', highRisk: 0 })
  })
})
