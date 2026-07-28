import { getRubric } from '@/lib/study/responseRubrics'
import { buildQualityPrompt } from '@/lib/study/gradePipeline'
import type { StageContext } from '@/lib/study/gradePipeline'

/**
 * Fidelity of our band descriptors to the official ETS scoring guides
 * (2025 PDFs, read directly rather than summarised).
 *
 * The guides use DIFFERENT conventions per skill, and every bug found in
 * this area so far has been a Writing convention leaking into Speaking:
 *
 *   Writing  — bands 5-3 "a typical response displays the following";
 *              bands 2 and 1 "exhibits ONE OR MORE of the following".
 *   Speaking — "a typical response exhibits the following" at EVERY
 *              band. There is no one-or-more shortcut downward.
 *
 * That difference is not cosmetic. Under a one-or-more reading, a spoken
 * answer with a single weak feature drops to band 2 even when it meets
 * every other descriptor of a higher band — which is how our grader came
 * to score real, on-topic answers two bands below the published rubric.
 */
const ctx = (skill: 'speaking' | 'writing'): StageContext => ({
  family: 'toefl',
  skill,
  taskType: skill === 'speaking' ? 'take_interview' : 'academic_discussion',
  promptText: 'p',
  responseText: 'r',
  language: 'en',
})

describe('band descriptors match the official guides', () => {
  it('does not apply the writing one-or-more rule to speaking descriptors', () => {
    const text = getRubric('toefl', 'speaking', 'take_interview').bandDescriptors
    expect(text).not.toMatch(/one or more/i)
  })

  it('keeps the one-or-more rule where the writing guides actually use it', () => {
    for (const task of ['email', 'academic_discussion'] as const) {
      const text = getRubric('toefl', 'writing', task).bandDescriptors
      expect(text).toMatch(/one or more/i)
    }
  })

  it('tells the speaking rater there is no shortcut down to band 2', () => {
    const p = buildQualityPrompt(ctx('speaking'))
    expect(p).toMatch(/EVERY band/i)
    expect(p).not.toMatch(/ONE OR MORE of the listed features is enough/i)
  })

  it('still tells the writing rater about the real asymmetry', () => {
    const p = buildQualityPrompt(ctx('writing'))
    expect(p).toMatch(/ONE OR MORE/i)
  })

  it('carries every ETS zero condition for the task it belongs to', () => {
    // Speaking's 0 omits "rejects the topic" and "copied from the prompt";
    // Writing's includes both. See zeroGateFlagsFor.
    const speaking = getRubric('toefl', 'speaking', 'take_interview').bandDescriptors
    expect(speaking).toMatch(/entirely unconnected/i)
    expect(speaking).toMatch(/I don't know/i)

    const writing = getRubric('toefl', 'writing', 'email').bandDescriptors
    expect(writing).toMatch(/entirely copied from the prompt/i)
    expect(writing).toMatch(/rejects the topic/i)
  })

  it('gives Listen and Repeat the unconnected condition the guide lists', () => {
    // The official Listen-and-Repeat 0 is not just "silence or gibberish"
    // — it also covers a response entirely unconnected to the stimulus.
    const text = getRubric('toefl', 'speaking', 'listen_repeat').bandDescriptors
    expect(text).toMatch(/entirely unconnected/i)
  })

  it('keeps Listen and Repeat an accuracy rubric, not a content one', () => {
    const text = getRubric('toefl', 'speaking', 'listen_repeat').bandDescriptors
    expect(text).toMatch(/repetition/i)
    // Nothing about elaboration or ideas — repeating a sentence well is
    // not the same task as answering a question well.
    expect(text).not.toMatch(/elaborat/i)
  })
})
