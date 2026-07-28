import {
  composeGraderPrompt, OPEN_RESPONSE_TYPES, RESPONSE_SKILL_BY_TYPE,
} from '@/lib/study/openResponse'

// The real item from session 114cc85d, which scored 3 on task
// fulfilment while scoring 5 on both language criteria.
const PASSAGE = `The campus career services office has emailed to invite you to a resume workshop next week, noting that spots are limited and that you should reply to reserve one. You are interested but will be traveling for part of that week.

In your email to career services, be sure to:
• Say whether you want to reserve a spot
• Ask whether any sessions fit around your travel dates
• Request one specific thing you hope the workshop will cover`
const PROMPT = '[Email] Read the email above and write your reply (target 100+ words).'

describe('composeGraderPrompt', () => {
  it('gives the grader the requirements it is scoring against', () => {
    const composed = composeGraderPrompt(PASSAGE, PROMPT)
    // Each required bullet must survive into what the model reads —
    // these ARE the task-fulfilment criteria.
    expect(composed).toContain('Say whether you want to reserve a spot')
    expect(composed).toContain('sessions fit around your travel dates')
    expect(composed).toContain('one specific thing')
    expect(composed).toContain(PROMPT)
  })

  it('puts the instruction last, closest to the response', () => {
    const composed = composeGraderPrompt(PASSAGE, PROMPT)
    expect(composed.indexOf(PASSAGE.slice(0, 40))).toBeLessThan(composed.indexOf(PROMPT))
  })

  it('falls back to the instruction when there is no passage', () => {
    // Speaking interviews carry the whole task in the prompt.
    expect(composeGraderPrompt(null, PROMPT)).toBe(PROMPT)
    expect(composeGraderPrompt('   ', PROMPT)).toBe(PROMPT)
  })

  it('does not repeat an instruction the passage already contains', () => {
    const both = `Some context.\n\n${PROMPT}`
    const composed = composeGraderPrompt(both, PROMPT)
    expect(composed.split(PROMPT).length - 1).toBe(1)
  })

  it('covers every open-response type', () => {
    // If a type is gradeable it must be reachable by this composition;
    // a type added to one map and not the other is the failure that
    // deriving the set from the map was meant to remove.
    expect([...OPEN_RESPONSE_TYPES].sort())
      .toEqual(Object.keys(RESPONSE_SKILL_BY_TYPE).sort())
  })
})
