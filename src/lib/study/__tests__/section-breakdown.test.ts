import {
  normaliseSectionLabel, bracketedLabel, buildSectionBreakdown, splitStrengths,
  type BreakdownItem,
} from '@/lib/study/section-breakdown'
import { scoreListenRepeat } from '@/lib/study/listen-repeat-accuracy'

describe('normaliseSectionLabel', () => {
  it('folds the variants the live bank actually contains', () => {
    // Every one of these pairs was two separate groups before.
    expect(normaliseSectionLabel('Academic Talk — Earth Science'))
      .toBe(normaliseSectionLabel('Academic Talk - Earth Science'))
    expect(normaliseSectionLabel('Announcement — residence hall'))
      .toBe(normaliseSectionLabel('Announcement — Residence Hall Staff'))
    expect(normaliseSectionLabel('Conversation — Student↔Student'))
      .toBe(normaliseSectionLabel('Conversation — Office hours'))
  })

  it('keeps genuinely different tasks apart', () => {
    const labels = [
      'Academic Talk — Geology', 'Conversation — Advising',
      'Announcement — Transit', 'Choose a Response',
    ].map(normaliseSectionLabel)
    expect(new Set(labels).size).toBe(4)
  })

  it('drops the noisy second segment, which is where the mess was', () => {
    expect(normaliseSectionLabel('Academic — Art History')).toBe('Academic')
    expect(normaliseSectionLabel('Daily Life — email')).toBe('Daily Life')
  })
})

describe('bracketedLabel', () => {
  it('reads the prefix the generator writes', () => {
    expect(bracketedLabel('[Conversation — Advising] Why does the student…'))
      .toBe('Conversation — Advising')
  })

  it('is null when there is no prefix, including SAT prompts', () => {
    expect(bracketedLabel('Which choice best states the main idea?')).toBeNull()
    expect(bracketedLabel('')).toBeNull()
    // A bracket that is not a prefix must not be mistaken for a label.
    expect(bracketedLabel('The value of f(x) [see graph] is…')).toBeNull()
  })
})

describe('buildSectionBreakdown', () => {
  const mc = (label: string, correct: boolean): BreakdownItem =>
    ({ type: 'multiple_choice', prompt: `[${label}] stem?`, correct })

  it('agrees with the section total it sits under', () => {
    // The load-bearing property: the parts must add to the whole. Both
    // go through scoreItem, so this holds by construction — the test is
    // here to fail if someone re-implements one of them.
    const items: BreakdownItem[] = [
      ...Array.from({ length: 4 }, () => mc('Conversation — Advising', true)),
      ...Array.from({ length: 4 }, () => mc('Academic Talk — Geology', false)),
    ]
    const b = buildSectionBreakdown(items, scoreListenRepeat)
    expect(b.groups.reduce((n, g) => n + g.earned, 0)).toBe(4)
    expect(b.groups.reduce((n, g) => n + g.max, 0)).toBe(8)
  })

  it('puts the weakest group first', () => {
    const items: BreakdownItem[] = [
      ...Array.from({ length: 3 }, () => mc('Announcement', true)),
      ...Array.from({ length: 3 }, () => mc('Conversation', false)),
    ]
    const b = buildSectionBreakdown(items, scoreListenRepeat)
    expect(b.groups[0]!.label).toBe('Conversation')
  })

  it('drops groups too small to mean anything, and says how many', () => {
    // 0/1 on Psychology is not a finding. It must not silently vanish
    // either — a hidden cap reads as "we covered everything".
    const items: BreakdownItem[] = [
      ...Array.from({ length: 4 }, () => mc('Conversation', true)),
      mc('Psychology', false),
      mc('Economics', false),
    ]
    const b = buildSectionBreakdown(items, scoreListenRepeat)
    expect(b.groups).toHaveLength(1)
    expect(b.covered).toBe(4)
    expect(b.omitted).toBe(2)
  })

  it('falls back to the task name when the prompt has no label', () => {
    const items: BreakdownItem[] = Array.from({ length: 3 }, () =>
      ({ type: 'arrange_words', prompt: 'Tap the words in order.', correct: true }))
    const b = buildSectionBreakdown(items, scoreListenRepeat)
    expect(b.groups[0]!.label).toBe('Build a Sentence')
  })

  it('keeps a one-item group that carries real points', () => {
    // Found on live data: minItems alone dropped BOTH Writing essays,
    // one item each, which together are 80% of the section score. The
    // card then showed only Build a Sentence and called it a breakdown.
    const items: BreakdownItem[] = [
      ...Array.from({ length: 10 }, () =>
        ({ type: 'arrange_words', prompt: '[Build a Sentence] order', correct: true })),
      { type: 'writing_email', prompt: '[Email] reply', rubricBand: 5 },
      { type: 'writing_discussion', prompt: '[Academic Discussion] post', rubricBand: 4 },
    ]
    const b = buildSectionBreakdown(items, scoreListenRepeat)
    expect(b.groups.map(g => g.label).sort())
      .toEqual(['Academic Discussion', 'Build a Sentence', 'Email'])
    expect(b.omitted).toBe(0)
  })

  it('does not give an unlabelled item its own group beside labelled ones', () => {
    // Found on live data: 38 Reading questions are plain passage items
    // whose prompt simply lacks the prefix. Bucketing them as "Multiple
    // choice" put a fake peer next to "Academic" and "Daily Life" — all
    // three ARE multiple choice, so the label described nothing.
    const items: BreakdownItem[] = [
      ...Array.from({ length: 5 }, () =>
        ({ type: 'multiple_choice', prompt: '[Academic — Art History] q', correct: true })),
      ...Array.from({ length: 3 }, () =>
        ({ type: 'multiple_choice', prompt: 'According to the passage, what…', correct: false })),
    ]
    const b = buildSectionBreakdown(items, scoreListenRepeat)
    expect(b.groups.map(g => g.label)).toEqual(['Academic'])
    expect(b.omitted).toBe(3)          // counted, not silently dropped
  })

  it('still uses task names when NOTHING in the set is labelled', () => {
    // Speaking and Writing rely on this; only the mixed case is barred.
    const items: BreakdownItem[] = [
      ...Array.from({ length: 3 }, () =>
        ({ type: 'arrange_words', prompt: 'order the words', correct: true })),
      { type: 'writing_email', prompt: 'write a reply', rubricBand: 4 },
    ]
    const b = buildSectionBreakdown(items, scoreListenRepeat)
    expect(b.groups.map(g => g.label).sort()).toEqual(['Build a Sentence', 'Write an Email'])
  })

  it('scores rubric items on their band, not right/wrong', () => {
    const items: BreakdownItem[] = [
      { type: 'writing_email', prompt: '[Email] reply', rubricBand: 5 },
      { type: 'writing_discussion', prompt: '[Discussion] contribute', rubricBand: 4 },
      { type: 'writing_email', prompt: '[Email] reply 2', rubricBand: 3 },
    ]
    const b = buildSectionBreakdown(items, scoreListenRepeat, { minItems: 1 })
    const email = b.groups.find(g => g.label === 'Email')!
    expect(email.earned).toBe(8)   // 5 + 3, not "2 correct"
    expect(email.max).toBe(10)
  })

  it('ignores an item still awaiting its grade', () => {
    const items: BreakdownItem[] = [
      { type: 'writing_email', prompt: '[Email] a', rubricBand: 4 },
      { type: 'writing_email', prompt: '[Email] b', rubricBand: null },
    ]
    const b = buildSectionBreakdown(items, scoreListenRepeat, { minItems: 1 })
    expect(b.groups[0]!.items).toBe(1)
    expect(b.groups[0]!.max).toBe(5)
  })

  it('collapses an unlabelled bank to a single group — SAT has no breakdown', () => {
    // SAT carries no bracketed prompts anywhere, so every item falls back
    // to the same type label. One group is not a breakdown and the card
    // must self-hide.
    //
    // Asserted as EXACTLY 1, not "at most 1": the loose form passed while
    // multiple_choice was scoring null and producing zero groups, which
    // is the bug three other tests here caught. A green that survives the
    // defect is not evidence.
    const items: BreakdownItem[] = Array.from({ length: 10 }, () =>
      ({ type: 'multiple_choice', prompt: 'Which choice…', correct: true }))
    const b = buildSectionBreakdown(items, scoreListenRepeat)
    expect(b.groups).toHaveLength(1)
    expect(b.groups[0]!.items).toBe(10)
  })
})

describe('splitStrengths', () => {
  const g = (label: string, proportion: number) =>
    ({ label, proportion, earned: 0, max: 0, items: 5 })

  it('leaves the ambiguous middle unlabelled', () => {
    // 68% a weakness and 71% a strength teaches nothing but that the
    // label is arbitrary.
    const s = splitStrengths([g('a', 0.68), g('b', 0.55)])
    expect(s.strengths).toHaveLength(0)
    expect(s.weaknesses).toHaveLength(0)
    expect(s.middle).toHaveLength(2)
  })

  it('calls the clear cases', () => {
    const s = splitStrengths([g('good', 0.9), g('bad', 0.2)])
    expect(s.strengths.map(x => x.label)).toEqual(['good'])
    expect(s.weaknesses.map(x => x.label)).toEqual(['bad'])
  })

  it('never puts a group on two sides', () => {
    const groups = [0, 0.3, 0.5, 0.69, 0.7, 1].map((p, i) => g(String(i), p))
    const s = splitStrengths(groups)
    expect(s.strengths.length + s.weaknesses.length + s.middle.length)
      .toBe(groups.length)
  })
})
