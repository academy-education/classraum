/**
 * ACT option letters alternate by QUESTION position: odd questions A-D,
 * even questions F-J. Every section, every form. Nothing else in the
 * app does this, and nothing covered choiceLabel at all before ACT
 * needed it to do something new.
 */
import { choiceLabel } from '../helpers'

describe('choiceLabel for ACT', () => {
  it('lettering follows the question position, not the choice index alone', () => {
    // question 1 (idx 0) -> A B C D
    expect([0, 1, 2, 3].map(i => choiceLabel('act', i, 0))).toEqual(['A', 'B', 'C', 'D'])
    // question 2 (idx 1) -> F G H J
    expect([0, 1, 2, 3].map(i => choiceLabel('act', i, 1))).toEqual(['F', 'G', 'H', 'J'])
    // question 50 (idx 49) -> F G H J
    expect(choiceLabel('act', 3, 49)).toBe('J')
  })

  it('never emits E or I', () => {
    for (let q = 0; q < 50; q++) for (let i = 0; i < 4; i++) {
      expect(['E', 'I']).not.toContain(choiceLabel('act', i, q))
    }
  })

  it('falls back to plain A-D when no question index is given', () => {
    expect(choiceLabel('act', 0)).toBe('A')
    expect(choiceLabel('act', 3)).toBe('D')
  })

  it('does not change any other family', () => {
    expect(choiceLabel('sat', 0, 1)).toBe(choiceLabel('sat', 0))
    expect(choiceLabel('ssat', 1, 1)).toBe(choiceLabel('ssat', 1))
    expect(choiceLabel('toefl', 2, 1)).toBe(choiceLabel('toefl', 2))
  })
})
