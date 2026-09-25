import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  composeGraderPrompt, OPEN_RESPONSE_TYPES, RESPONSE_SKILL_BY_TYPE, UNSCORED_RESPONSE_TYPES,
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
    // The invariant CHANGED on 2026-09-25 and this test changed with it.
    // OPEN_RESPONSE_TYPES used to be exactly the rubric map's keys; it is now
    // that union the UNSCORED types (ISEE Essay, SSAT Writing Sample), which
    // have no answer key and no rubric. The anti-drift property the original
    // test existed for is preserved: the union is still DERIVED, so a type
    // cannot be in one place and not the other.
    expect([...OPEN_RESPONSE_TYPES].sort())
      .toEqual([...Object.keys(RESPONSE_SKILL_BY_TYPE), ...UNSCORED_RESPONSE_TYPES].sort())
  })

  it('the rubric-graded and unscored sets are disjoint', () => {
    // A type in both would reach the grader, which looks its skill up in
    // RESPONSE_SKILL_BY_TYPE and would hand the rubric `undefined`.
    const overlap = [...UNSCORED_RESPONSE_TYPES].filter(t => t in RESPONSE_SKILL_BY_TYPE)
    expect(overlap).toEqual([])
  })

  it('every caller that sends to the grader guards on the skill map, not the union', () => {
    // This is the bug the split was made to prevent, so it is pinned at the
    // call sites rather than trusted. Each of these fires the rubric grader
    // or renders a rubric band; guarding on OPEN_RESPONSE_TYPES would send an
    // unscored admission essay to a grader with no skill for it, and leave the
    // result screen waiting on a band nobody issues.
    for (const f of [
      'src/app/mobile/study/session/[id]/TestSession.tsx',
      'src/app/mobile/study/session/[id]/test/TestResultView.tsx',
      'src/app/api/study/response/grade-batch/route.ts',
    ]) {
      const src = readFileSync(join(process.cwd(), f), 'utf8')
      expect(src).not.toMatch(/OPEN_RESPONSE_TYPES\.has/)
      expect(src).toMatch(/RESPONSE_SKILL_BY_TYPE/)
    }
  })
})
