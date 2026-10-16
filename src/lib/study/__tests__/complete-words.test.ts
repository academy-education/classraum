/** @jest-environment node */
import { blankWords, repeatedBlankWords } from '../complete-words'

jest.mock('@/lib/supabase-admin', () => ({ dbAdmin: {} }))

// The live item the owner hit on 2026-10-16 (bank row 5b818452), cut down:
// "bound[N]" + "aries" four times.
const BOUNDARIES = {
  passage:
    'These plates interact at their bound[3], leading to geolog[4] phenomena. ' +
    'Convergent bound[6] occur when plates collide, while divergent bound[7] are where ' +
    'plates move apart. Transform bound[8] involve plates sliding past each other.',
  blanks: [
    { id: 3, answer: 'aries' }, { id: 4, answer: 'ical' }, { id: 6, answer: 'aries' },
    { id: 7, answer: 'aries' }, { id: 8, answer: 'aries' },
  ],
}

describe('Complete the Words: every blank is a different word', () => {
  it('reconstructs each blanked word from its prefix and answer', () => {
    expect(blankWords(BOUNDARIES.passage, BOUNDARIES.blanks)).toEqual(
      ['boundaries', 'geological', 'boundaries', 'boundaries', 'boundaries'])
  })

  it('flags the live item that blanked "boundaries" four times', () => {
    expect(repeatedBlankWords(BOUNDARIES.passage, BOUNDARIES.blanks)).toEqual(['boundaries'])
  })

  it('passes a paragraph whose blanks are all different words', () => {
    const passage = 'The litho[1] floats on the astheno[2], driven by cur[3] in the mantle.'
    const blanks = [{ id: 1, answer: 'sphere' }, { id: 2, answer: 'sphere' }, { id: 3, answer: 'rents' }]
    // Same ANSWER letters ("sphere") but different WORDS — allowed.
    expect(repeatedBlankWords(passage, blanks)).toEqual([])
  })

  it('compares case-insensitively', () => {
    const passage = 'Psych[1] grew. Later psych[2] split.'
    const blanks = [{ id: 1, answer: 'ology' }, { id: 2, answer: 'ology' }]
    expect(repeatedBlankWords(passage, blanks)).toEqual(['psychology'])
  })
})

describe('the assembler never serves a repeated-word paragraph', () => {
  const item = (passage: string, blanks: { id: number; answer: string }[]) => ({
    type: 'fill_in_blanks', prompt: '[Complete the Words] Fill in the missing letters in each word.',
    choices: [], correct_answer: '', difficulty: 'hard', passage, blanks,
  })

  it('refuses the boundaries x4 item and serves a clean one', async () => {
    const { readBankItem } = await import('../assemble')
    expect(readBankItem(item(BOUNDARIES.passage, BOUNDARIES.blanks))).toBeNull()
    const clean = readBankItem(item('The litho[1] floats on the astheno[2].',
      [{ id: 1, answer: 'sphere' }, { id: 2, answer: 'sphere' }]))
    expect(clean?.type).toBe('fill_in_blanks')
    expect(clean?.blanks).toHaveLength(2)
  })
})
