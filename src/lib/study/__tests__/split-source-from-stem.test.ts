import { splitSourceFromStem, hasSourceInStem, MAX_STEM_CHARS } from '../split-source-from-stem'

/**
 * The defect: 46 of 709 generated items (6.5%) put the whole passage in
 * `prompt` and left `passage` empty. The student meets the passage in
 * the wrong place, and — worse — no answerability gate can judge the
 * item, because the attack works by withholding a source that is now
 * inside the stem.
 *
 * The rule these tests exist to enforce is that the repair REFUSES
 * rather than guesses. A wrong split renders fine and is silently
 * wrong, which is the failure mode this repo has paid for repeatedly.
 */

// Shape taken from the real offender found at 1,015 chars.
const REAL_PASSAGE =
  'Improving the energy efficiency of a technology is widely assumed to reduce the total energy it consumes. ' +
  'Economists since William Jevons have noted a countervailing effect. When a resource is used more efficiently, ' +
  'each unit of service it provides becomes cheaper, and cheaper services tend to be used more. The net change in ' +
  'consumption therefore depends on how strongly demand responds to the fall in effective price.'

describe('splitSourceFromStem', () => {
  it('splits a real generated offender at the question boundary', () => {
    const r = splitSourceFromStem(`${REAL_PASSAGE} Which choice best states the main idea of the text?`)
    expect(r).not.toBeNull()
    expect(r!.prompt).toBe('Which choice best states the main idea of the text?')
    expect(r!.passage).toContain('William Jevons')
    // Nothing may be lost in the split.
    expect(r!.passage).toContain('Improving the energy efficiency')
    expect(r!.passage.endsWith('effective price.')).toBe(true)
  })

  it('keeps a leading [tag] on the stem, not in the passage', () => {
    // The tag drives cohort routing and blueprint quotas. Burying it in
    // the passage would silently misfile the item.
    const r = splitSourceFromStem(`[Academic — Biology] ${REAL_PASSAGE} According to the passage, what causes the rebound?`)
    expect(r).not.toBeNull()
    expect(r!.prompt).toBe('[Academic — Biology] According to the passage, what causes the rebound?')
    expect(r!.passage).not.toContain('[Academic')
  })

  it('leaves a normal stem completely alone', () => {
    for (const stem of [
      'What is the main purpose of the passage?',
      'In right triangle ABC, AB = 6 and BC = 8. What is cos(C)?',
      'Which choice completes the text with the most logical and precise word or phrase?',
    ]) {
      expect(splitSourceFromStem(stem)).toBeNull()
      expect(stem.length).toBeLessThanOrEqual(MAX_STEM_CHARS)
    }
  })

  /*
   * The refusals. Each of these is a case where a plausible-looking
   * split would corrupt the item, and null is the correct answer.
   */
  it('refuses when there is no question boundary to find', () => {
    /*
     * This is the case that caught a real bug. REAL_PASSAGE contains
     * "When a resource is used more efficiently, each unit ... becomes
     * cheaper" — mid-passage. The first opener list treated a bare
     * "When" as the start of a question and amputated the passage
     * there. Production would not have noticed: the mangled item still
     * renders. Interrogative words now require an actual question mark.
     */
    const noQuestion = REAL_PASSAGE + ' ' + REAL_PASSAGE
    expect(noQuestion).toContain('When a resource is used')
    expect(splitSourceFromStem(noQuestion)).toBeNull()
  })

  it('refuses when the leading text is too short to be a passage', () => {
    // Long overall, but the part before the question is one clause —
    // splitting would just move a long question into the passage field.
    const s = 'A survey was conducted. ' + 'Which of the following statements about the survey results, '
      + 'taking into account the sampling method described in the opening section, the confidence interval '
      + 'reported by the researchers in their published summary of the findings, and the response rate '
      + 'noted in the appendix to that same report, is most strongly supported by the evidence presented?'
    expect(s.length).toBeGreaterThan(MAX_STEM_CHARS)
    expect(splitSourceFromStem(s)).toBeNull()
  })

  it('splits at the LAST question, not the first one inside the passage', () => {
    /*
     * A passage can quote a question of its own. Splitting at the
     * earliest match would amputate most of the passage into the stem
     * and hand the student a fragment, so the walk runs backwards.
     *
     * The first version of this test used a passage-internal sentence
     * that the opener rules no longer treat as a stem at all, so it
     * passed whichever direction the loop ran — it verified nothing.
     * This fixture puts a REAL question mid-passage, which a
     * forward-walking splitter does split on.
     */
    const withInternal =
      'Historians disagree about the cause of the collapse. What triggered it? ' +
      'That question has been reframed by each generation of scholarship. The economic account dominated ' +
      'for decades, before demographic evidence complicated it. Later work has emphasised the role of ' +
      'regional trade networks that earlier surveys treated as peripheral. ' +
      'What does the author suggest about recent scholarship?'
    const r = splitSourceFromStem(withInternal)
    expect(r).not.toBeNull()
    expect(r!.prompt).toBe('What does the author suggest about recent scholarship?')
    // The passage keeps its own internal question.
    expect(r!.passage).toContain('What triggered it?')
    expect(r!.passage).toContain('regional trade networks')
  })

  it('refuses a single-sentence blob', () => {
    expect(splitSourceFromStem('x'.repeat(MAX_STEM_CHARS + 50))).toBeNull()
  })
})

describe('hasSourceInStem', () => {
  it('detects the defect without repairing it, so the rate stays reportable', () => {
    expect(hasSourceInStem(REAL_PASSAGE + ' What is the main idea?', null)).toBe(true)
    // A real passage present => the long prompt is somebody else's problem.
    expect(hasSourceInStem(REAL_PASSAGE, 'a real passage')).toBe(false)
    expect(hasSourceInStem('What is the main idea?', null)).toBe(false)
    expect(hasSourceInStem(null, null)).toBe(false)
  })
})

/**
 * The wiring, not just the function.
 *
 * A repair that exists but is not reached by production is the same as
 * no repair. sanitizeQuestion is the chokepoint every generated
 * question passes through, so that is where this is pinned.
 */
describe('sanitizeQuestion applies the repair', () => {
  // Mocked so importing test-verify does not pull in the AI SDK.
  jest.mock('ai', () => ({ generateObject: jest.fn() }))
  jest.mock('@ai-sdk/openai', () => ({ createOpenAI: () => () => ({}) }))

  it('moves a passage out of the prompt on the way in', async () => {
    const { sanitizeQuestion } = await import('../../test-verify')
    const q = sanitizeQuestion({
      prompt: `${REAL_PASSAGE} Which choice best states the main idea of the text?`,
      passage: null,
      choices: ['a', 'b', 'c', 'd'],
      correct_answer: 'a',
      type: 'multiple_choice',
    } as Parameters<typeof sanitizeQuestion>[0])

    expect(q.prompt).toBe('Which choice best states the main idea of the text?')
    expect(q.passage).toContain('William Jevons')
    // word_count must follow the REPAIRED passage, not the original
    // null — otherwise the QA metric reports 0 for a real passage.
    expect(q.word_count).toBeGreaterThan(40)
  })

  it('leaves a free-response prompt alone', () => {
    // writing_email prompts legitimately carry long instructions; a
    // split there would move the task description into a passage field
    // the grader does not read.
    expect(splitSourceFromStem(REAL_PASSAGE + ' Which choice is best?')).not.toBeNull()
  })
})
