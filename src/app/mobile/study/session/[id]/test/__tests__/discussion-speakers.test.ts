/** @jest-environment node */
/**
 * Academic Discussion speaker splitting.
 *
 * Reported symptom: in the Writing section, a second classmate's post
 * rendered INSIDE the first classmate's card, with no division between
 * them. The card said "Student 1 Pablo" and contained Pablo's paragraph
 * followed by "Ayşe: I'd set limits…".
 *
 * Cause: the speaker regex matched names with [A-Za-zÀ-ÿ], which is
 * Latin-1 only (U+00C0–U+00FF). It covers Zoë and Renée but not Turkish
 * ş/ğ/ı, Polish ł, or Czech ř/í. An unmatched name is not an error — the
 * text simply stays attached to the previous speaker, so the failure is
 * silent and the student reads two people's opinions as one person's.
 */
import { parseDiscussionSpeakers } from '../discussion-speakers'

describe('parseDiscussionSpeakers', () => {
  it('splits speakers whose names use Latin Extended letters', () => {
    // Every one of these was invisible to the old [A-Za-zÀ-ÿ] class.
    const text = [
      'Professor Novak: Should a popular town welcome unlimited tourism or restrict it?',
      'Pablo: Towns should welcome tourism. Visitors fund hotels and shops that give local people jobs.',
      'Ayşe: I would set limits. When too many tourists flood a small town, rents soar and locals get priced out.',
      'Łukasz: Capping numbers and charging fees keeps tourism a benefit for the community.',
      'Jiří: Fees work better than hard caps, because they scale with demand.',
    ].join('\n\n')

    const blocks = parseDiscussionSpeakers(text)
    expect(blocks.map(b => b.name)).toEqual(['Novak', 'Pablo', 'Ayşe', 'Łukasz', 'Jiří'])
    expect(blocks[0]!.role).toBe('professor')
    for (const b of blocks.slice(1)) expect(b.role).toBe('student')
    // The whole point: nobody else's words are inside Pablo's post.
    expect(blocks[1]!.body).not.toMatch(/Ayşe|Łukasz|Jiří/)
  })

  it('splits speakers that run together on one line with no blank line', () => {
    // The harvest-v1 cohort stores discussions this way: the professor
    // and the first student share a line, and the only blank line sits
    // INSIDE a student's post as a paragraph break.
    const text =
      'Professor Lin: Should companies rely on AI to make hiring decisions? ' +
      'Aisha: I think they should, because AI can process thousands of applications consistently.\n\n' +
      'Of course, the algorithms need care. ' +
      'Mehmet: I disagree, because a model trained on past hires repeats the same bias.'

    const blocks = parseDiscussionSpeakers(text)
    expect(blocks.map(b => b.name)).toEqual(['Lin', 'Aisha', 'Mehmet'])
    expect(blocks[1]!.body).not.toMatch(/Mehmet/)
    // The mid-post paragraph break belongs to Aisha, not to a new speaker.
    expect(blocks[1]!.body).toMatch(/algorithms need care/)
  })

  it('does not treat mid-sentence colons as speakers', () => {
    const text =
      'Professor Reed: Consider the tradeoff below.\n\n' +
      'Marco: The goal: lower costs without cutting staff. That is the hard part here.\n\n' +
      'Nadia: I agree with Marco that the tradeoff is mostly about timing.'

    const blocks = parseDiscussionSpeakers(text)
    expect(blocks.map(b => b.name)).toEqual(['Reed', 'Marco', 'Nadia'])
    expect(blocks[1]!.body).toMatch(/The goal: lower costs/)
  })

  it('returns [] when there is no discussion structure to show', () => {
    expect(parseDiscussionSpeakers('Just a single block of prose with no speakers.')).toEqual([])
  })
})
