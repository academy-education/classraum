import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  composeGraderPrompt, isBatchGradedType, OPEN_RESPONSE_TYPES, PRACTICE_FEEDBACK_TYPES,
  RESPONSE_SKILL_BY_TYPE, UNSCORED_RESPONSE_TYPES,
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
    // call sites rather than trusted. Guarding on OPEN_RESPONSE_TYPES would
    // send an unscored type to a grader with no skill for it. Since
    // 2026-10-27 the batch ALSO grades the practice essays, through
    // PRACTICE_FEEDBACK_TYPES; the client trigger and the batch filter share
    // isBatchGradedType / planBatchTargets so they cannot disagree.
    const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')
    for (const f of [
      'src/app/mobile/study/session/[id]/TestSession.tsx',
      'src/app/mobile/study/session/[id]/test/TestResultView.tsx',
      'src/app/api/study/response/grade-batch/route.ts',
      'src/lib/study/gradeBatchTargets.ts',
    ]) {
      expect(read(f)).not.toMatch(/OPEN_RESPONSE_TYPES\.has/)
    }
    expect(read('src/app/mobile/study/session/[id]/TestSession.tsx')).toMatch(/isBatchGradedType\(/)
    expect(read('src/app/mobile/study/session/[id]/test/TestResultView.tsx')).toMatch(/RESPONSE_SKILL_BY_TYPE/)
    expect(read('src/app/api/study/response/grade-batch/route.ts')).toMatch(/planBatchTargets\(/)
    const targets = read('src/lib/study/gradeBatchTargets.ts')
    expect(targets).toMatch(/RESPONSE_SKILL_BY_TYPE/)
    expect(targets).toMatch(/PRACTICE_FEEDBACK_TYPES/)
  })
})

describe('practice feedback types (2026-10-27)', () => {
  it('are exactly the two admission essays, and stay unscored', () => {
    expect([...PRACTICE_FEEDBACK_TYPES].sort()).toEqual(['essay', 'essay_choice'])
    // Still out of the key-scored denominator...
    for (const t of PRACTICE_FEEDBACK_TYPES) expect(UNSCORED_RESPONSE_TYPES.has(t)).toBe(true)
    for (const t of PRACTICE_FEEDBACK_TYPES) expect(OPEN_RESPONSE_TYPES.has(t)).toBe(true)
    // ...and out of every rubric / section score, which all key on the skill map.
    for (const t of PRACTICE_FEEDBACK_TYPES) expect(t in RESPONSE_SKILL_BY_TYPE).toBe(false)
  })

  it('isBatchGradedType covers rubric and practice types and nothing key-scored', () => {
    for (const t of ['speaking_interview', 'writing_email', 'writing_discussion', 'essay', 'essay_choice']) {
      expect(isBatchGradedType(t)).toBe(true)
    }
    for (const t of ['multiple_choice', 'arrange_words', 'speaking_repeat', 'fill_in_blanks', '', null, 'toString']) {
      expect(isBatchGradedType(t)).toBe(false)
    }
  })
})
