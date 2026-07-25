/** @jest-environment node */
import { z } from 'zod'
import {
  analyzePadding,
  applyCeiling,
  enforceRelevanceCeiling,
  runStagedGrade,
  type QualityStageCall,
  type StageContext,
  type TextStageCall,
} from '../study/gradePipeline'
import {
  RELEVANCE_CEILING_5,
  RelevanceSchema,
  ZeroGateSchema,
  getRubric,
  inferSpeakingTaskType,
  relevanceCeiling,
  zeroGateTriggered,
  type Grade,
  type Relevance,
  type RelevanceLevel,
  type ZeroGate,
} from '../study/responseRubrics'
import { overallBandFromSections, speakingLegacyScoreToBand } from '../study/toeflBands'

const INTERVIEW_PROMPT = 'Tell me about a time you helped a classmate with a difficult assignment.'

const cleanGate: ZeroGate = {
  quotedSpan: 'Last term a classmate...',
  reasoning: 'The response is in English and attempts the question.',
  noResponse: false,
  notInEnglish: false,
  entirelyUnintelligible: false,
  rejectsTopic: false,
  entirelyCopiedFromPrompt: false,
  entirelyUnconnected: false,
  arbitraryKeystrokes: false,
  feedback: '',
}

function relevance(level: RelevanceLevel): Relevance {
  return {
    promptDemands: ['describe a time you helped a classmate'],
    onTopicEvidence: '',
    offTopicEvidence: 'hard work is the most important thing in life',
    borrowedLanguageEvidence: '',
    elaborationAssessment: 'Asserted and dropped.',
    irrelevantShare: 'most',
    level,
  }
}

function grade(overall: number, relevanceKey = 'topic_relevance'): Grade {
  return {
    summary: 'Fluent, clean grammar.',
    criteria: [
      { key: relevanceKey, evidence: 'quote', score: overall },
      { key: 'delivery', evidence: 'quote', score: overall },
      { key: 'language_use', evidence: 'quote', score: overall },
    ],
    annotations: [],
    modelRewrite: '',
    overallBand: overall,
  }
}

/** Stub stages. `text` dispatches on which schema it was handed so the
 *  same stub serves both the zero gate and the relevance ladder. */
function stubCalls(opts: { gate?: ZeroGate; rel?: Relevance; quality?: Grade }) {
  const calls: string[] = []
  const text: TextStageCall = async ({ schema, prompt }) => {
    if ((schema as z.ZodType<unknown>) === (ZeroGateSchema as z.ZodType<unknown>)) {
      calls.push('zero_gate')
      expect(prompt).toContain(INTERVIEW_PROMPT)
      return { object: (opts.gate ?? cleanGate) as never, usage: { tokensIn: 10, tokensOut: 5 } }
    }
    if ((schema as z.ZodType<unknown>) === (RelevanceSchema as z.ZodType<unknown>)) {
      calls.push('relevance')
      return { object: (opts.rel ?? relevance('on_topic_elaborated')) as never, usage: { tokensIn: 20, tokensOut: 6 } }
    }
    throw new Error('unexpected schema')
  }
  const quality: QualityStageCall = async () => {
    calls.push('quality')
    return { object: opts.quality ?? grade(5), usage: { tokensIn: 30, tokensOut: 9 } }
  }
  return { calls, stages: { text, quality } }
}

const ctx: StageContext = {
  family: 'toefl',
  skill: 'speaking',
  taskType: 'take_interview',
  promptText: INTERVIEW_PROMPT,
  responseText: 'Well, I think helping is very important in our society, and hard work is the most important thing in life.',
  language: 'en',
}

// ---------------------------------------------------------------------------
// Stage 2 — the relevance ceiling
// ---------------------------------------------------------------------------

describe('relevance ceiling', () => {
  it('maps each ETS relevance level to its band ceiling', () => {
    expect(RELEVANCE_CEILING_5).toEqual({
      fully_on_topic_well_elaborated: 5,
      on_topic_elaborated: 4,
      generally_on_topic_limited_elaboration: 3,
      minimally_connected: 2,
      vaguely_connected: 1,
      entirely_unconnected: 0,
    })
  })

  it('caps rather than averages — a fluent, vaguely connected answer is a 1', () => {
    // The old holistic grader landed this at 3.5. ETS says 1.
    expect(applyCeiling(4.5, RELEVANCE_CEILING_5.vaguely_connected)).toBe(1)
  })

  it('never raises a weak language score to the ceiling', () => {
    expect(applyCeiling(2, RELEVANCE_CEILING_5.fully_on_topic_well_elaborated)).toBe(2)
  })

  it('projects the ladder onto the IELTS 0–9 scale in half bands', () => {
    expect(relevanceCeiling('fully_on_topic_well_elaborated', 9)).toBe(9)
    expect(relevanceCeiling('minimally_connected', 9)).toBe(3.5)
    expect(relevanceCeiling('entirely_unconnected', 9)).toBe(0)
    expect(relevanceCeiling('generally_on_topic_limited_elaboration', 5)).toBe(3)
  })

  it('caps the relevance criterion but leaves the language criteria intact', () => {
    const rubric = getRubric('toefl', 'speaking', 'take_interview')
    const out = enforceRelevanceCeiling(grade(5), rubric, 2)
    expect(out.grade.overallBand).toBe(2)
    expect(out.ceilingApplied).toBe(true)
    expect(out.languageScore).toBe(5)
    expect(out.grade.criteria.find(c => c.key === 'topic_relevance')?.score).toBe(2)
    // The student still sees that delivery/language were strong.
    expect(out.grade.criteria.find(c => c.key === 'delivery')?.score).toBe(5)
  })

  it('reports no ceiling applied when language is already below it', () => {
    const rubric = getRubric('toefl', 'speaking', 'take_interview')
    const out = enforceRelevanceCeiling(grade(3), rubric, 5)
    expect(out.grade.overallBand).toBe(3)
    expect(out.ceilingApplied).toBe(false)
  })

  it('clamps out-of-range model output to the rubric scale', () => {
    const rubric = getRubric('toefl', 'speaking', 'take_interview')
    const out = enforceRelevanceCeiling(grade(9), rubric, 5)
    expect(out.grade.overallBand).toBe(5)
  })
})

describe('runStagedGrade — ceiling enforcement end to end', () => {
  it('caps a fluent but off-topic interview answer at band 2', async () => {
    const { calls, stages } = stubCalls({
      quality: grade(4.5),
      rel: relevance('minimally_connected'),
    })
    const res = await runStagedGrade(ctx, stages)
    expect(res.grade.overallBand).toBe(2)
    expect(res.languageScore).toBe(4.5)
    expect(res.relevanceCeiling).toBe(2)
    expect(res.ceilingApplied).toBe(true)
    expect(calls).toContain('relevance')
    expect(calls).toContain('quality')
  })

  it('leaves a fully on-topic answer at the language score', async () => {
    const { stages } = stubCalls({
      quality: grade(4),
      rel: relevance('fully_on_topic_well_elaborated'),
    })
    const res = await runStagedGrade(ctx, stages)
    expect(res.grade.overallBand).toBe(4)
    expect(res.ceilingApplied).toBe(false)
  })

  it('sums token usage across every stage', async () => {
    const { stages } = stubCalls({})
    const res = await runStagedGrade(ctx, stages)
    expect(res.usage).toEqual({ tokensIn: 60, tokensOut: 20 })
  })

  it('skips the relevance ladder for Listen and Repeat (accuracy rubric)', async () => {
    const { calls, stages } = stubCalls({
      quality: {
        ...grade(5, 'repetition_accuracy'),
      },
    })
    const res = await runStagedGrade({ ...ctx, taskType: 'listen_repeat' }, stages)
    expect(calls).not.toContain('relevance')
    expect(res.relevance).toBeNull()
    expect(res.relevanceCeiling).toBeNull()
    expect(res.grade.overallBand).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Stage 1 — the hard zero gate
// ---------------------------------------------------------------------------

describe('zero gate', () => {
  it('is not triggered when every ETS 0-band condition is false', () => {
    expect(zeroGateTriggered(cleanGate)).toBe(false)
  })

  it.each([
    'noResponse',
    'notInEnglish',
    'entirelyUnintelligible',
    'rejectsTopic',
    'entirelyCopiedFromPrompt',
    'entirelyUnconnected',
    'arbitraryKeystrokes',
  ] as const)('is triggered by %s alone', flag => {
    expect(zeroGateTriggered({ ...cleanGate, [flag]: true })).toBe(true)
  })

  it('short-circuits the pipeline — no relevance or quality call is made', async () => {
    const { calls, stages } = stubCalls({
      gate: { ...cleanGate, entirelyUnconnected: true, feedback: 'This answers a different question.' },
    })
    const res = await runStagedGrade(ctx, stages)
    expect(calls).toEqual(['zero_gate'])
    expect(res.grade.overallBand).toBe(0)
    expect(res.zeroReasons).toEqual(['entirelyUnconnected'])
    expect(res.relevance).toBeNull()
    expect(res.languageScore).toBeNull()
  })

  it('zeroes every criterion and carries the model feedback (no hardcoded copy)', async () => {
    const { stages } = stubCalls({
      gate: { ...cleanGate, arbitraryKeystrokes: true, feedback: '무작위 입력입니다.' },
    })
    const res = await runStagedGrade(ctx, stages)
    expect(res.grade.criteria.every(c => c.score === 0)).toBe(true)
    expect(res.grade.summary).toBe('무작위 입력입니다.')
  })

  it('does not fire on a merely weak response', async () => {
    const { calls, stages } = stubCalls({
      quality: grade(2),
      rel: relevance('generally_on_topic_limited_elaboration'),
    })
    const res = await runStagedGrade(ctx, stages)
    expect(calls).toContain('quality')
    expect(res.grade.overallBand).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Stage 3 — padding / prompt-echo detection
// ---------------------------------------------------------------------------

describe('analyzePadding', () => {
  it('flags a response built mainly from the prompt language', () => {
    const p = analyzePadding(
      'Do you think students should be required to wear school uniforms?',
      'I think students should be required to wear school uniforms. Students wear uniforms.',
    )
    expect(p.promptEchoRatio).toBeGreaterThan(0.8)
    expect(p.longestBorrowedRun).toBeGreaterThanOrEqual(8)
    expect(p.looksRecycled).toBe(true)
  })

  it('does not flag original content', () => {
    const p = analyzePadding(
      'Tell me about a time you helped a classmate.',
      'Last term Mina kept misreading the meniscus during titration, so I stayed behind and we redid the measurement together until her numbers matched the reference values.',
    )
    expect(p.looksRecycled).toBe(false)
    expect(p.promptEchoRatio).toBeLessThan(0.3)
  })

  it('measures padding by restatement', () => {
    const p = analyzePadding('Describe your hometown.', 'Busy busy busy busy city city city city.')
    expect(p.repetitionRatio).toBeGreaterThan(0.6)
  })

  it('is safe on an empty response', () => {
    expect(analyzePadding('Describe your hometown.', '   ')).toEqual({
      contentWordCount: 0,
      promptEchoRatio: 0,
      repetitionRatio: 0,
      longestBorrowedRun: 0,
      looksRecycled: false,
    })
  })
})

// ---------------------------------------------------------------------------
// Rubric wiring
// ---------------------------------------------------------------------------

describe('TOEFL speaking rubrics', () => {
  it('scores Take an Interview 0–5 with NO preparation time', () => {
    const r = getRubric('toefl', 'speaking', 'take_interview')
    expect(r.scaleMax).toBe(5)
    expect(r.timeLimit).toEqual({ kind: 'seconds', value: 45 })
    expect(r.timeLimit.prepSeconds).toBeUndefined()
    expect(r.usesRelevanceLadder).toBe(true)
  })

  it('treats Listen and Repeat as an accuracy rubric, not a content rubric', () => {
    const r = getRubric('toefl', 'speaking', 'listen_repeat')
    expect(r.usesRelevanceLadder).toBe(false)
    expect(r.relevanceCriterionKey).toBeUndefined()
  })

  it('recovers the speaking task type from the generator prompt tag', () => {
    expect(inferSpeakingTaskType('[Listen and Repeat] The library closes early.')).toBe('listen_repeat')
    expect(inferSpeakingTaskType('[Interview] What do you think of online learning?')).toBe('take_interview')
    expect(inferSpeakingTaskType('Untagged prompt')).toBe('take_interview')
  })

  it('gives the Email task its own social-conventions criterion', () => {
    const r = getRubric('toefl', 'writing', 'email')
    expect(r.criteria.map(c => c.key)).toContain('social_conventions')
    expect(r.relevanceCriterionKey).toBe('task_fulfillment')
  })
})

describe('TOEFL 1–6 band reporting (Jan 2026 format)', () => {
  it('follows the official legacy 0–30 → band concordance', () => {
    expect(speakingLegacyScoreToBand(28)).toBe(6)
    expect(speakingLegacyScoreToBand(25)).toBe(5)
    expect(speakingLegacyScoreToBand(23)).toBe(4.5)
    expect(speakingLegacyScoreToBand(21)).toBe(4)
    expect(speakingLegacyScoreToBand(18)).toBe(3.5)
    expect(speakingLegacyScoreToBand(16)).toBe(3)
    expect(speakingLegacyScoreToBand(14)).toBe(2.5)
    expect(speakingLegacyScoreToBand(11)).toBe(2)
    expect(speakingLegacyScoreToBand(7)).toBe(1.5)
    expect(speakingLegacyScoreToBand(0)).toBe(1)
  })

  it('reports overall as the mean of section bands, rounded to a half band', () => {
    expect(overallBandFromSections([4, 4.5, 5, 5])).toBe(4.5)
    expect(overallBandFromSections([3, 3.5, 4, 4])).toBe(3.5)
    expect(overallBandFromSections([])).toBeNull()
  })
})
