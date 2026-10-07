/** @jest-environment node */
import { z } from 'zod'
import {
  analyzePadding,
  applyCeiling,
  buildZeroGatePrompt,
  enforceRelevanceCeiling,
  levelAfterGatePassed,
  runStagedGrade,
  type QualityStageCall,
  type StageContext,
  type TextStageCall,
} from '../study/gradePipeline'
import {
  RELEVANCE_CEILING_5,
  RelevanceSchema,
  WritingZeroGateSchema,
  ZeroGateSchema,
  getRubric,
  inferSpeakingTaskType,
  quoteOccursIn,
  reconcileWritingGate,
  relevanceCeiling,
  zeroGateSchemaFor,
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
  const gateSchemas: z.ZodType<unknown>[] = []
  const text: TextStageCall = async ({ schema, schemaName, prompt }) => {
    if (schemaName === 'zero_gate') {
      calls.push('zero_gate')
      gateSchemas.push(schema as z.ZodType<unknown>)
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
  return { calls, gateSchemas, stages: { text, quality } }
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
  it.each(['writing', 'speaking'] as const)(
    'is not triggered for %s when every 0-band condition is false', skill => {
      expect(zeroGateTriggered(cleanGate, skill)).toBe(false)
    })

  // The official Writing guide's whole 0 description: "The response is
  // blank, rejects the topic, is not in English, is entirely copied from
  // the prompt, is entirely unconnected to the prompt or consists of
  // arbitrary keystrokes."
  it.each([
    'noResponse',
    'notInEnglish',
    'rejectsTopic',
    'entirelyCopiedFromPrompt',
    'entirelyUnconnected',
    'arbitraryKeystrokes',
  ] as const)('zeroes a WRITING response on %s alone', flag => {
    expect(zeroGateTriggered({ ...cleanGate, [flag]: true }, 'writing')).toBe(true)
  })

  it('does NOT zero a WRITING response as "entirely unintelligible" — not a Writing 0 condition', () => {
    // Writing puts unintelligibility at band 1 ("The message may be
    // limited to the point of being unintelligible"). The ladder found
    // band-1 borrowed-phrase answers zeroed on this flag in 10 of 12.
    expect(zeroGateTriggered({ ...cleanGate, entirelyUnintelligible: true }, 'writing')).toBe(false)
  })

  it('does not even ask the Writing gate about unintelligibility', () => {
    expect(zeroGateSchemaFor('writing')).toBe(WritingZeroGateSchema)
    expect(Object.keys(WritingZeroGateSchema.shape)).not.toContain('entirelyUnintelligible')
    expect(Object.keys(WritingZeroGateSchema.shape).sort()).toEqual([
      'arbitraryKeystrokes', 'connectedSpan', 'entirelyCopiedFromPrompt', 'entirelyUnconnected', 'feedback',
      'noResponse', 'notInEnglish', 'originalWords', 'quotedSpan', 'reasoning', 'refusalQuote', 'rejectsTopic',
    ])
    // Evidence is emitted BEFORE the flags it decides.
    const keys = Object.keys(WritingZeroGateSchema.shape)
    expect(keys.indexOf('connectedSpan')).toBeLessThan(keys.indexOf('entirelyUnconnected'))
    expect(keys.indexOf('originalWords')).toBeLessThan(keys.indexOf('entirelyCopiedFromPrompt'))
    expect(keys.indexOf('refusalQuote')).toBeLessThan(keys.indexOf('rejectsTopic'))
  })

  describe('reconcileWritingGate — the guide\'s "entirely", enforced against the gate\'s own quotes', () => {
    const PROMPT = 'Professor Lee asks you to help organize next month\'s Departmental Research Symposium. Reply to the email.'
    // email-lee-G from the ladder, shortened: fluent, mostly off topic.
    const OFF_TOPIC = 'Dear Professor Lee, Thank you for your email about the symposium. I have enjoyed your seminar on research ethics. Unfortunately, I am busy with my thesis.'

    it('keeps entirelyUnconnected off when the gate itself quoted a connected span', () => {
      const g = reconcileWritingGate({ ...cleanGate, entirelyUnconnected: true, connectedSpan: 'Thank you for your email about the symposium.' }, PROMPT, OFF_TOPIC)
      expect(g.entirelyUnconnected).toBe(false)
      expect(zeroGateTriggered(g, 'writing')).toBe(false)
    })

    it('honours entirelyUnconnected when no connected span was quoted', () => {
      const g = reconcileWritingGate({ ...cleanGate, entirelyUnconnected: true, connectedSpan: '' }, PROMPT, 'My favourite food is kimchi stew and I cook it every Sunday.')
      expect(zeroGateTriggered(g, 'writing')).toBe(true)
    })

    it('ignores a "connected" quote that is not actually in the response', () => {
      const g = reconcileWritingGate({ ...cleanGate, entirelyUnconnected: true, connectedSpan: 'I would love to help with the symposium' }, PROMPT, 'My favourite food is kimchi stew.')
      expect(g.entirelyUnconnected).toBe(true)
    })

    it('accepts a quote with an ellipsis when every piece is in the response', () => {
      expect(quoteOccursIn('Dear Professor Lee... busy with my thesis', OFF_TOPIC)).toBe(true)
      expect(quoteOccursIn('Dear Professor Lee... busy with my exams', OFF_TOPIC)).toBe(false)
    })

    it('keeps entirelyCopiedFromPrompt off when the writer added words of their own', () => {
      const borrowed = 'Professor Lee. help organize next month\'s Departmental Research Symposium. ok I help little. thank you'
      const g = reconcileWritingGate({ ...cleanGate, entirelyCopiedFromPrompt: true, originalWords: 'ok I help little. thank you' }, PROMPT, borrowed)
      expect(g.entirelyCopiedFromPrompt).toBe(false)
    })

    it('honours entirelyCopiedFromPrompt when the quoted "own" words are all the prompt\'s', () => {
      const copied = 'Professor Lee asks you to help organize next month\'s Departmental Research Symposium.'
      const g = reconcileWritingGate({ ...cleanGate, entirelyCopiedFromPrompt: true, originalWords: 'help organize' }, PROMPT, copied)
      expect(g.entirelyCopiedFromPrompt).toBe(true)
    })

    it('needs a real quoted refusal for rejectsTopic — declining inside the scenario is not one', () => {
      const none = reconcileWritingGate({ ...cleanGate, rejectsTopic: true, refusalQuote: '' }, PROMPT, OFF_TOPIC)
      expect(none.rejectsTopic).toBe(false)
      const refusal = 'I will not write this email because the question is pointless.'
      const real = reconcileWritingGate({ ...cleanGate, rejectsTopic: true, refusalQuote: 'I will not write this email' }, PROMPT, refusal)
      expect(real.rejectsTopic).toBe(true)
    })

    it('leaves blank / not English / keystrokes alone', () => {
      for (const flag of ['noResponse', 'notInEnglish', 'arbitraryKeystrokes'] as const) {
        expect(reconcileWritingGate({ ...cleanGate, [flag]: true }, PROMPT, 'asdf')[flag]).toBe(true)
      }
    })

    it('is applied by the pipeline to Writing — a contradicted flag does not zero the answer', async () => {
      const { calls, stages } = stubCalls({
        gate: { ...cleanGate, entirelyUnconnected: true, rejectsTopic: true, connectedSpan: 'Thank you for your email about the symposium', refusalQuote: '' },
        quality: grade(4, 'task_fulfillment'),
        rel: relevance('minimally_connected'),
      })
      const res = await runStagedGrade({ ...ctx, skill: 'writing', taskType: 'email', promptText: `${INTERVIEW_PROMPT} ${PROMPT}`, responseText: OFF_TOPIC }, stages)
      expect(res.zeroReasons).toEqual([])
      expect(calls).toContain('quality')
      expect(res.grade.overallBand).toBe(2)
    })
  })

  describe('only the gate decides a 0', () => {
    it('floors the relevance ladder at vaguely_connected once the gate has passed', () => {
      expect(levelAfterGatePassed('entirely_unconnected')).toBe('vaguely_connected')
      expect(levelAfterGatePassed('minimally_connected')).toBe('minimally_connected')
      expect(levelAfterGatePassed('fully_on_topic_well_elaborated')).toBe('fully_on_topic_well_elaborated')
    })

    it.each(['writing', 'speaking'] as const)(
      'a %s answer the ladder calls entirely_unconnected is capped at 1, not zeroed', async skill => {
        const { stages } = stubCalls({ quality: grade(4, skill === 'writing' ? 'contribution' : 'topic_relevance'), rel: relevance('entirely_unconnected') })
        const res = await runStagedGrade({ ...ctx, skill, taskType: skill === 'writing' ? 'academic_discussion' : 'take_interview' }, stages)
        expect(res.zeroReasons).toEqual([])
        expect(res.relevanceCeiling).toBe(1)
        expect(res.grade.overallBand).toBe(1)
      })

    it('the gate still zeroes a genuinely unconnected answer', async () => {
      const { stages } = stubCalls({ gate: { ...cleanGate, entirelyUnconnected: true, connectedSpan: '' } })
      const res = await runStagedGrade({ ...ctx, skill: 'writing', taskType: 'academic_discussion' }, stages)
      expect(res.grade.overallBand).toBe(0)
      expect(res.zeroReasons).toEqual(['entirelyUnconnected'])
    })
  })

  it('leaves the Speaking gate schema as it was', () => {
    expect(zeroGateSchemaFor('speaking')).toBe(ZeroGateSchema)
  })

  it('quotes the Writing guide\'s 0 sentence verbatim and places the near-misses at bands 1-2', () => {
    const p = buildZeroGatePrompt({ ...ctx, skill: 'writing', taskType: 'email' })
    expect(p).toContain('"The response is blank, rejects the topic, is not in English, is entirely copied from the prompt, is entirely unconnected to the prompt or consists of arbitrary keystrokes."')
    // No Speaking-only condition offered as a Writing 0.
    expect(p).not.toMatch(/^- it is entirely unintelligible/m)
    expect(p).not.toMatch(/I don't know/)
    // Partial relevance and heavy borrowing are named as low bands.
    expect(p).toMatch(/band 2: "Limited or irrelevant elaboration"/)
    expect(p).toMatch(/band 1: "Minimal original language; any coherent language is mostly borrowed from the stimulus"/)
    expect(p).toMatch(/turning down an invitation/)
  })

  it('keeps the Speaking gate prompt on Speaking\'s own conditions', () => {
    const p = buildZeroGatePrompt(ctx)
    expect(p).toMatch(/entirely unintelligible/)
    expect(p).not.toMatch(/official ETS TOEFL WRITING 0-band rule/)
  })

  it('a Writing answer the gate calls "unintelligible" is graded on the bands, not zeroed', async () => {
    const { calls, gateSchemas, stages } = stubCalls({
      gate: { ...cleanGate, entirelyUnintelligible: true, feedback: 'unintelligible' },
      quality: grade(1, 'contribution'),
      rel: relevance('minimally_connected'),
    })
    const res = await runStagedGrade({ ...ctx, skill: 'writing', taskType: 'academic_discussion' }, stages)
    expect(gateSchemas[0]).toBe(WritingZeroGateSchema)
    expect(res.zeroReasons).toEqual([])
    expect(calls).toContain('quality')
    expect(res.grade.overallBand).toBe(1)
  })

  // The two official guides do NOT list the same conditions, and we had
  // been applying Writing's to both skills.
  it.each(['noResponse', 'notInEnglish', 'entirelyUnintelligible', 'entirelyUnconnected'] as const)(
    'zeroes a SPEAKING response on %s alone', flag => {
      expect(zeroGateTriggered({ ...cleanGate, [flag]: true }, 'speaking')).toBe(true)
    })

  it.each(['rejectsTopic', 'entirelyCopiedFromPrompt', 'arbitraryKeystrokes'] as const)(
    'does NOT zero a SPEAKING response on %s — not an ETS speaking 0 condition', flag => {
      // Speaking's score-2 descriptor reads "consists mainly of language
      // from the question", so a copied spoken answer is a 2, not a 0.
      expect(zeroGateTriggered({ ...cleanGate, [flag]: true }, 'speaking')).toBe(false)
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
      // ctx is a SPEAKING context, so the flag has to be one of
      // speaking's own 0 conditions. arbitraryKeystrokes cannot describe
      // a spoken answer at all — it is a writing condition, and using it
      // here only passed while both skills shared one flag list.
      gate: { ...cleanGate, entirelyUnintelligible: true, feedback: '무작위 입력입니다.' },
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

// ---------------------------------------------------------------------------
// Bounded schema retry on every stage (grader ladder 2026-10-07: four
// rubric_grade schema failures, each a 502 in production)
// ---------------------------------------------------------------------------

describe('runStagedGrade — schema retry', () => {
  const schemaError = () => Object.assign(new Error('No object generated: response did not match schema.'), {
    name: 'AI_NoObjectGeneratedError',
  })

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })

  function flakyQuality(real: QualityStageCall, failures: number) {
    let n = 0
    return jest.fn(async (args: Parameters<QualityStageCall>[0]) => {
      n++
      if (n <= failures) throw schemaError()
      return real(args)
    })
  }

  it('recovers a quality stage that fails its schema twice, sending the same prompt each time', async () => {
    const { stages } = stubCalls({ quality: grade(3), rel: relevance('on_topic_elaborated') })
    const quality = flakyQuality(stages.quality, 2)
    const retries: string[] = []
    const res = await runStagedGrade(ctx, { text: stages.text, quality }, {
      onStageRetry: i => retries.push(`${i.stage}#${i.attempt}`),
    })
    expect(res.grade.overallBand).toBe(3)
    expect(quality).toHaveBeenCalledTimes(3)
    expect(new Set(quality.mock.calls.map(c => c[0].prompt)).size).toBe(1)
    expect(retries).toEqual(['rubric_grade#1', 'rubric_grade#2'])
  })

  it('retries the zero gate and the relevance ladder too', async () => {
    const { stages } = stubCalls({ quality: grade(4), rel: relevance('on_topic_elaborated') })
    let gateFails = 1
    let relFails = 2
    const text: TextStageCall = async args => {
      if (args.schemaName === 'zero_gate' && gateFails-- > 0) throw schemaError()
      if (args.schemaName === 'relevance_ladder' && relFails-- > 0) throw schemaError()
      return stages.text(args)
    }
    const retries: string[] = []
    const res = await runStagedGrade(ctx, { text, quality: stages.quality }, {
      onStageRetry: i => retries.push(i.stage),
    })
    expect(res.grade.overallBand).toBe(4)
    expect(retries.sort()).toEqual(['relevance_ladder', 'relevance_ladder', 'zero_gate'])
  })

  it('all retries fail → the pipeline throws and returns no score', async () => {
    const { stages } = stubCalls({ quality: grade(3) })
    const quality = flakyQuality(stages.quality, 99)
    let result: unknown = 'none'
    let thrown: unknown
    try {
      result = await runStagedGrade(ctx, { text: stages.text, quality })
    } catch (e) {
      thrown = e
    }
    expect((thrown as Error).name).toBe('AI_NoObjectGeneratedError')
    expect(result).toBe('none')
    expect(quality).toHaveBeenCalledTimes(3)
  })

  it('does not retry a non-schema failure', async () => {
    const { stages } = stubCalls({})
    const quality = jest.fn(async () => { throw Object.assign(new Error('500'), { name: 'AI_APICallError' }) })
    await expect(runStagedGrade(ctx, { text: stages.text, quality })).rejects.toThrow('500')
    expect(quality).toHaveBeenCalledTimes(1)
  })
})
