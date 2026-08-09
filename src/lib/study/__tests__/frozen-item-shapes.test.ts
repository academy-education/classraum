/**
 * The three frozen TOEFL item types finally have insert paths — and a
 * shape check each. This pins what those checks reject.
 *
 * 249 live items (93 Complete the Words, 108 Build a Sentence, 48
 * Interview) had NO insert command at all: they entered by a path that no
 * longer exists, so the bank could serve them and could not grow them.
 *
 * Both halves matter and only one is testable here. The accept half was
 * checked against the live bank — 93/93, 108/108, 48/48 — because a rule
 * that rejects what is already banked is wrong. This file is the reject
 * half: a rule that accepts everything is decoration.
 *
 * The blanks rule is why the live check came first. Its first draft
 * counted underscore runs and matched 0 of 93 items — the marker is
 * "[n]". Fixtures invented alongside the rule would have agreed with the
 * rule and passed.
 */
import {
  checkFillInBlanks,
  checkArrangeWords,
  checkSpeakingInterview,
} from '../../../../scripts/study-bank/frozen-shapes.mjs'

/** Shapes copied from live rows, so "valid" means what the bank holds. */
const VALID_BLANKS = {
  type: 'fill_in_blanks',
  passage: 'The Renaissance mar[1]ed a shift in how art[2] worked, with new commis[3]ions arriving from [4] patrons, and reg[5]onal courts com[6]eting for [7]alent across [8]taly and bey[9]nd the [10]lps.',
  blanks: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, answer: 'x', alternates: null })),
}
const VALID_ARRANGE = {
  type: 'arrange_words',
  choices: ['the solution', 'was implemented', 'last quarter'],
  correct_answer: 'The solution | was implemented | last quarter',
}
const VALID_INTERVIEW = {
  type: 'speaking_interview',
  prompt: '[Interview] Describe a regular commitment alongside your studies.',
  passage: 'The careers office is collecting student views on working while studying.',
  correct_answer: '',
  passageGroupId: 'interview-part-time-work',
}

describe('fill_in_blanks', () => {
  it('accepts a live-shaped item', () => {
    expect(checkFillInBlanks(VALID_BLANKS)).toBeNull()
  })
  it('rejects a blank count that disagrees with the [n] markers', () => {
    // The student sees one box per marker; a mismatch means a box with no
    // answer behind it, or an answer with no box.
    expect(checkFillInBlanks({ ...VALID_BLANKS, blanks: VALID_BLANKS.blanks.slice(0, 9) }))
      .toMatch(/9 blanks but 10/)
  })
  it('rejects ids that do not run 1..N in order', () => {
    const blanks = VALID_BLANKS.blanks.map((b, i) => (i === 3 ? { ...b, id: 9 } : b))
    expect(checkFillInBlanks({ ...VALID_BLANKS, blanks })).toMatch(/1\.\.N/)
  })
  it('rejects an empty answer', () => {
    const blanks = VALID_BLANKS.blanks.map((b, i) => (i === 2 ? { ...b, answer: '  ' } : b))
    expect(checkFillInBlanks({ ...VALID_BLANKS, blanks })).toMatch(/blank 3 has no answer/)
  })
})

describe('arrange_words', () => {
  it('accepts a live-shaped item', () => {
    expect(checkArrangeWords(VALID_ARRANGE)).toBeNull()
  })
  it('rejects an answer that adds a chunk the student never has', () => {
    // A student can only ever emit a permutation of the chunks, so any
    // other answer is unreachable and the item cannot be answered.
    expect(checkArrangeWords({ ...VALID_ARRANGE, correct_answer: 'The solution | was implemented | last quarter | by the team' }))
      .toMatch(/permutation/)
  })
  it('rejects an answer that drops a chunk', () => {
    expect(checkArrangeWords({ ...VALID_ARRANGE, correct_answer: 'The solution | was implemented' }))
      .toMatch(/permutation/)
  })
  it('ignores case and punctuation when comparing', () => {
    // Authors capitalise the opening chunk in the answer; that is not a
    // different chunk.
    expect(checkArrangeWords({ ...VALID_ARRANGE, correct_answer: 'the solution | was implemented | LAST QUARTER.' })).toBeNull()
  })
})

describe('speaking_interview', () => {
  it('accepts a live-shaped item', () => {
    expect(checkSpeakingInterview(VALID_INTERVIEW)).toBeNull()
  })
  it('rejects a non-empty key on a free-response task', () => {
    // A key here would be graded against as though it were the only right
    // answer to an open spoken question.
    expect(checkSpeakingInterview({ ...VALID_INTERVIEW, correct_answer: 'I worked in a cafe.' }))
      .toMatch(/must be empty/)
  })
  it('rejects a missing passageGroupId', () => {
    expect(checkSpeakingInterview({ ...VALID_INTERVIEW, passageGroupId: '' })).toMatch(/passageGroupId/)
  })
  it('rejects a missing situation', () => {
    expect(checkSpeakingInterview({ ...VALID_INTERVIEW, passage: '' })).toMatch(/situation/)
  })
})
