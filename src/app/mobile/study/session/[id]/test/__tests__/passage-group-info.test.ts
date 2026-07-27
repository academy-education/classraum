import { passageGroupInfo } from '../helpers'
import type { Question } from '../types'

function q(partial: Partial<Question>): Question {
  return {
    prompt: 'p',
    type: 'multiple_choice',
    choices: ['a', 'b', 'c', 'd'],
    correct_answer: 'a',
    difficulty: 'medium',
    explanation: '',
    ...partial,
  }
}

/** Five items that CLAIM one passage group but carry three different
 *  passage texts — the shape of the corrupt production TOEFL Reading
 *  data (26 of 34 groups span multiple passages). */
const corrupt: Question[] = [
  q({ passageGroupId: 'g1', passage: 'Passage A text.' }),
  q({ passageGroupId: 'g1', passage: 'Passage A text.' }),
  q({ passageGroupId: 'g1', passage: 'Totally different passage B.' }),
  q({ passageGroupId: 'g1', passage: 'Totally different passage B.' }),
  q({ passageGroupId: 'g1', passage: 'And a third passage C.' }),
  q({ passageGroupId: 'g2', passage: 'Clean passage D.' }),
  q({ passageGroupId: 'g2', passage: 'Clean passage D.' }),
]

describe('passageGroupInfo', () => {
  it('never counts items whose passage text differs as one passage set', () => {
    for (let i = 0; i < corrupt.length; i++) {
      const info = passageGroupInfo(corrupt, i)
      if (!info) continue
      // Every item the counter claims is in this set must show the
      // SAME passage text as the current item.
      const same = corrupt.filter(x => x.passage === corrupt[i].passage
        && x.passageGroupId === corrupt[i].passageGroupId).length
      expect(info.totalInGroup).toBeLessThanOrEqual(same)
      expect(info.indexInGroup).toBeLessThanOrEqual(info.totalInGroup)
    }
  })

  it('reports the honest run for the corrupt group', () => {
    // Items 0-1 share text A -> "Question 1/2 of 2"
    expect(passageGroupInfo(corrupt, 0)).toMatchObject({ indexInGroup: 1, totalInGroup: 2 })
    expect(passageGroupInfo(corrupt, 1)).toMatchObject({ indexInGroup: 2, totalInGroup: 2 })
    // Items 2-3 share text B -> a DIFFERENT passage, own counter
    expect(passageGroupInfo(corrupt, 2)).toMatchObject({ indexInGroup: 1, totalInGroup: 2 })
    // Item 4 stands alone -> no counter at all
    expect(passageGroupInfo(corrupt, 4)).toBeNull()
  })

  it('numbers passages by what is on screen, not by group id', () => {
    expect(passageGroupInfo(corrupt, 0)?.groupIndex).toBe(1)
    expect(passageGroupInfo(corrupt, 2)?.groupIndex).toBe(2)
    // Item 4's lone passage C still counts as a distinct passage the
    // student sees, so the clean g2 set is passage 4 of 4.
    expect(passageGroupInfo(corrupt, 5)?.groupIndex).toBe(4)
    expect(passageGroupInfo(corrupt, 5)?.totalGroups).toBe(4)
  })

  it('ignores escaping/whitespace differences when comparing passages', () => {
    const qs = [
      q({ passageGroupId: 'g1', passage: 'Line one.\n\nLine two.' }),
      q({ passageGroupId: 'g1', passage: 'Line one.\\n\\nLine two.' }),
      q({ passageGroupId: 'g2', passage: 'Other.' }),
      q({ passageGroupId: 'g2', passage: 'Other.' }),
    ]
    expect(passageGroupInfo(qs, 0)).toMatchObject({ indexInGroup: 1, totalInGroup: 2 })
  })

  it('does not merge module 1 and module 2 items into one passage set', () => {
    const qs = [
      q({ passageGroupId: 'g1', passage: 'M1 passage.' }),
      q({ passageGroupId: 'g1', passage: 'M1 passage.' }),
      q({ passageGroupId: 'g2', passage: 'M1 other.' }),
      q({ passageGroupId: 'g2', passage: 'M1 other.' }),
      // Module 2 appended: same id AND same text as the M1 set.
      q({ passageGroupId: 'g1', passage: 'M1 passage.' }),
      q({ passageGroupId: 'g1', passage: 'M1 passage.' }),
      q({ passageGroupId: 'g3', passage: 'M2 second.' }),
      q({ passageGroupId: 'g3', passage: 'M2 second.' }),
    ]
    const m1 = passageGroupInfo(qs, 0, 4)
    expect(m1).toMatchObject({ groupIndex: 1, totalGroups: 2, indexInGroup: 1, totalInGroup: 2 })
    const m2 = passageGroupInfo(qs, 4, 4)
    // Module 2 counts its own passages, and its set has 2 items, not 4.
    expect(m2).toMatchObject({ groupIndex: 1, totalGroups: 2, indexInGroup: 1, totalInGroup: 2 })
  })

  it('never groups fill_in_blanks items', () => {
    const qs = [
      q({ passageGroupId: 'g1', passage: 'Same para [1].', type: 'fill_in_blanks' }),
      q({ passageGroupId: 'g1', passage: 'Same para [1].', type: 'fill_in_blanks' }),
      q({ passageGroupId: 'g2', passage: 'Reading.' }),
      q({ passageGroupId: 'g2', passage: 'Reading.' }),
    ]
    expect(passageGroupInfo(qs, 0)).toBeNull()
    expect(passageGroupInfo(qs, 1)).toBeNull()
  })

  it('returns null for ungrouped or passage-less items', () => {
    const qs = [
      q({ passage: 'Standalone.' }),
      q({ passageGroupId: 'g1', passage: null }),
      q({ passageGroupId: 'g2', passage: 'Reading.' }),
      q({ passageGroupId: 'g2', passage: 'Reading.' }),
    ]
    expect(passageGroupInfo(qs, 0)).toBeNull()
    expect(passageGroupInfo(qs, 1)).toBeNull()
  })
})
