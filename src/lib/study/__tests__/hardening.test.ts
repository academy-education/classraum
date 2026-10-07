/** @jest-environment node */
import {
  applyHardeningEdit, canHarden, gradeVerdict, hardeningHint, medianBand, type BankItemJson,
} from '@/lib/study/hardening'
import { renderForGrading, shownOrder, structuralChecks, swapAll, numericValue, type StagedEdit } from '@/lib/study/hardening-gate'

const ORIGINAL: BankItemJson = {
  prompt: 'Which choice completes the text?',
  passage: 'The committee ______ its report on Friday.',
  choices: ['release', 'released', 'releasing', 'to release'],
  correct_answer: 'released',
  explanation: 'A finite past-tense verb is needed.',
  distractor_rationales: [
    { choice: 'release', reason: 'present, no agreement' },
    { choice: 'releasing', reason: 'not finite' },
    { choice: 'to release', reason: 'not finite' },
  ],
  graphic: null,
  topic_tag: 'kept',
}

describe('canHarden', () => {
  it('is super_admin only', () => {
    expect(canHarden('super_admin')).toBe(true)
    for (const r of ['admin', 'manager', 'teacher', 'student', null, undefined, '']) expect(canHarden(r)).toBe(false)
  })
})

describe('applyHardeningEdit', () => {
  it('builds the staged item from a distractor change, keeping unknown keys and the key', () => {
    const r = applyHardeningEdit(ORIGINAL, { choices: ['release', 'released', 'releasing', 'has released'] }, { passageShared: false })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.changed).toEqual(['choices'])
    expect(r.item.correct_answer).toBe('released')
    expect(r.item.topic_tag).toBe('kept')
    // the edited distractor loses its old rationale; untouched ones keep theirs
    expect(r.item.distractor_rationales).toEqual([
      { choice: 'release', reason: 'present, no agreement' },
      { choice: 'releasing', reason: 'not finite' },
      { choice: 'has released', reason: '' },
    ])
    // the ORIGINAL object is not mutated
    expect((ORIGINAL.choices as string[])[3]).toBe('to release')
  })

  it('moves the key with correctIndex and records it', () => {
    const r = applyHardeningEdit(ORIGINAL, { prompt: 'Which choice completes the text so it conforms?', correctIndex: 0 }, { passageShared: false })
    expect(r.ok && r.item.correct_answer).toBe('release')
    expect(r.ok && r.changed).toEqual(['prompt', 'correct_answer'])
  })

  it.each([
    ['explanation only', { explanation: 'Different words entirely.' }, /explanation-only/],
    ['reorder only', { choices: ['released', 'release', 'releasing', 'to release'], correctIndex: 0 }, /reorder-only/],
    ['case/punctuation only', { prompt: 'which choice completes the text' }, /Change the stem/],
    ['a dropped option', { choices: ['release', 'released', 'releasing'] }, /Keep 4 options/],
    ['a blank option', { choices: ['release', 'released', ' ', 'to release'] }, /blank/],
    ['two options that read the same', { choices: ['release', 'released', 'Released.', 'to release'] }, /read the same/],
    ['a key index off the end', { prompt: 'New stem?', correctIndex: 4 }, /key/],
    ['an empty stem', { prompt: '   ' }, /stem cannot be empty/],
    ['an empty explanation', { prompt: 'New stem?', explanation: '' }, /explanation cannot be empty/],
  ])('refuses %s', (_label, edit, msg) => {
    const r = applyHardeningEdit(ORIGINAL, edit as never, { passageShared: false })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(msg)
  })

  it('refuses a passage edit when the passage is shared, allows it when not', () => {
    const edit = { passage: 'The committee, after weeks of delay, ______ its report.' }
    const shared = applyHardeningEdit(ORIGINAL, edit, { passageShared: true })
    expect(shared.ok).toBe(false)
    if (!shared.ok) expect(shared.error).toMatch(/shared/)
    expect(applyHardeningEdit(ORIGINAL, edit, { passageShared: true }).ok).toBe(false)
    const alone = applyHardeningEdit(ORIGINAL, edit, { passageShared: false })
    expect(alone.ok && alone.changed).toEqual(['passage'])
  })

  it('refuses items whose options are not plain text', () => {
    const r = applyHardeningEdit({ ...ORIGINAL, choices: null }, { prompt: 'x?' }, { passageShared: false })
    expect(r.ok).toBe(false)
  })
})

describe('gradeVerdict / medianBand', () => {
  const k = ['B', 'C', 'A']
  const s = (pick: string, difficulty: string, second_defensible: string | null = 'none') => ({ pick, difficulty, second_defensible })

  it('passes only on 3/3 key, no double second-defensible, median hard', () => {
    const v = gradeVerdict([s('B', 'hard'), s('C', 'hard'), s('A', 'medium')], k)
    expect(v).toMatchObject({ pass: true, difficulty: 'hard', onKey: 3 })
  })
  it('fails a sound edit that is still medium — the original already is one', () => {
    const v = gradeVerdict([s('B', 'hard'), s('C', 'medium'), s('A', 'medium')], k)
    expect(v.pass).toBe(false)
    expect(v.reasons.join()).toMatch(/median difficulty medium/)
  })
  it('fails a broken key even when everyone calls it hard', () => {
    const v = gradeVerdict([s('B', 'hard'), s('D', 'hard'), s('A', 'hard')], k)
    expect(v.pass).toBe(false)
    expect(v.reasons.join()).toMatch(/2\/3/)
  })
  it('fails when two samples name a second defensible option, not when one does', () => {
    expect(gradeVerdict([s('B', 'hard', 'D'), s('C', 'hard', 'A'), s('A', 'hard')], k).pass).toBe(false)
    expect(gradeVerdict([s('B', 'hard', 'D'), s('C', 'hard', 'none'), s('A', 'hard', '')], k).pass).toBe(true)
  })
  it('refuses fewer than three samples rather than scoring them', () => {
    expect(gradeVerdict([s('B', 'hard'), s('C', 'hard')], ['B', 'C']).pass).toBe(false)
  })
  it('a missing band is not a medium', () => {
    expect(medianBand(['hard', null, 'hard'])).toBeNull()
    expect(medianBand(['easy', 'hard', 'medium'])).toBe('medium')
    expect(medianBand(['hard', 'hard', 'easy'])).toBe('hard')
  })
})

describe('hints', () => {
  it('names the binding SAT domains specifically and falls back otherwise', () => {
    expect(hardeningHint('sat', 'math', 'Algebra', null).en).toMatch(/solution-count/)
    expect(hardeningHint('sat', 'reading_writing', 'Standard English Conventions', null).en).toMatch(/BOUNDARY/)
    expect(hardeningHint('sat', 'reading_writing', 'Craft and Structure', null).ko).toBeTruthy()
    expect(hardeningHint('toefl', 'reading', 'x', null).en).toMatch(/source covered/)
  })
})

describe('gate: structural checks', () => {
  const base: StagedEdit = { editId: 'e', family: 'sat', section: 'math', domain: 'Algebra', subskill: null, original: { ...ORIGINAL, choices: ['1', '2', '3', '4'], correct_answer: '2' }, staged: { ...ORIGINAL, choices: ['1', '2', '3', '5'], correct_answer: '2' } }
  it('passes a clean edit', () => expect(structuralChecks(base)).toEqual([]))
  it('catches two maths options with one value', () => {
    expect(structuralChecks({ ...base, staged: { ...base.staged, choices: ['1/2', '0.5', '3', '5'], correct_answer: '3' } })[0]).toMatch(/same value/)
    expect(numericValue('50%')).toBe(0.5)
    expect(numericValue('x + 1')).toBeNull()
  })
  it('catches a key outside the options and a changed option count', () => {
    expect(structuralChecks({ ...base, staged: { ...base.staged, correct_answer: '9' } })).toContain('key is not one of the options')
    expect(structuralChecks({ ...base, staged: { ...base.staged, choices: ['1', '2', '3'] } }).join()).toMatch(/option count/)
  })
  it('catches an SEC stem edit that removed the blank', () => {
    const sec: StagedEdit = { ...base, section: 'reading_writing', domain: 'Standard English Conventions', original: ORIGINAL, staged: { ...ORIGINAL, passage: 'The committee released its report.' } }
    expect(structuralChecks(sec).join()).toMatch(/blank/)
  })
})

describe('gate: render', () => {
  const edits: StagedEdit[] = Array.from({ length: 12 }, (_, i) => ({
    editId: `edit-${i}`, family: 'sat', section: 'math', domain: 'Algebra', subskill: null,
    original: ORIGINAL, staged: { ...ORIGINAL, choices: ['k1', 'k2', 'k3', 'k4'].map(c => `${c}-${i}`), correct_answer: `k2-${i}` },
  }))
  it('the key file points at the key under each item\'s own shuffle, and the render never marks it', () => {
    const r = renderForGrading('run-1', edits)
    for (const [label, editId] of Object.entries(r.labels)) {
      const i = Number(editId.split('-')[1])
      const line = r.markdown.split('\n').find(l => l.startsWith(`${r.key[label]}. `) && r.markdown.indexOf(l) > r.markdown.indexOf(`## ${label}`))
      expect(line).toBe(`${r.key[label]}. k2-${i}`)
    }
    expect(r.markdown).not.toMatch(/correct|key:|\(key\)|✓/i)
    // not all in one slot: the render shuffles
    expect(new Set(Object.values(r.key)).size).toBeGreaterThan(1)
  })
  it('shuffles deterministically', () => {
    expect(shownOrder('a', 4)).toEqual(shownOrder('a', 4))
    expect([...shownOrder('a', 4)].sort()).toEqual([0, 1, 2, 3])
  })
})

describe('gate: swap is idempotent', () => {
  it('a second run swaps nothing and reports already_swapped', async () => {
    // Stand-in for study_item_hardening_swap: the same state machine as the SQL.
    const state: Record<string, 'passed' | 'swapped'> = { e1: 'passed', e2: 'passed' }
    let liveWrites = 0
    const rpc = async (id: string) => {
      if (state[id] === 'swapped') return { data: 'already_swapped', error: null }
      state[id] = 'swapped'; liveWrites++
      return { data: 'swapped', error: null }
    }
    const first = await swapAll(['e1', 'e2'], rpc)
    expect(first).toMatchObject({ swapped: 2, already: 0, refused: 0 })
    const second = await swapAll(['e1', 'e2'], rpc)
    expect(second).toMatchObject({ swapped: 0, already: 2, refused: 0 })
    expect(liveWrites).toBe(2)
  })
  it('reports refusals and errors instead of counting them as swaps', async () => {
    const r = await swapAll(['a', 'b', 'c'], async id => id === 'a' ? { data: 'original_changed', error: null }
      : id === 'b' ? { data: null, error: { message: 'boom' } } : { data: 'weird', error: null })
    expect(r).toMatchObject({ swapped: 0, already: 0, refused: 3 })
  })
})
