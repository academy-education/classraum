import { SSAT_WRITING_SERVED_2026_10_11 } from '@/lib/study/__fixtures__/ssat-writing-served'
import { encodeEssayAnswer } from '@/lib/study/essayChoice'
import { planBatchTargets, type BatchAttempt } from '@/lib/study/gradeBatchTargets'
import { weightedScore } from '@/lib/study/test-grading'
import { scoreSplit, type ResultRow, type RubricGrade } from '@/lib/study/test-result'
import { decideRubricSessionScore } from '@/lib/study/session-score-decision'
import { scoreItem } from '@/lib/study/toefl-section-score'

/**
 * Grade-batch routing (2026-10-27): the ISEE Essay and SSAT Writing Sample
 * now reach the batch for PRACTICE feedback, the grader sees the CHOSEN
 * prompt, and neither type enters any score.
 */
const SERVED = SSAT_WRITING_SERVED_2026_10_11.questions[0]!
const STORY = 'The vending machine gave back more money than I had put in, and the next day it did it again.'
const ESSAY_PROMPT_HEAD = 'When a school team or club has more people'
const ISEE_PROMPT = 'Some students learn best when they work through a problem alone; others learn best with a group. Which teaches you more?'

const plan = (attempts: BatchAttempt[], topicSlug: string, audio: number[] = []) =>
  planBatchTargets(attempts, { topicSlug, audioGradedPositions: new Set(audio) })

describe('planBatchTargets', () => {
  it('routes an SSAT Writing Sample to practice grading with ONLY the chosen prompt', () => {
    const answer = encodeEssayAnswer('Story Starter', `${STORY} So I told the office.`)
    const [t, ...rest] = plan([{ position: 0, question: SERVED, student_answer: answer }], 'ssat-writing')
    expect(rest).toHaveLength(0)
    expect(t).toMatchObject({ kind: 'practice', family: 'ssat', type: 'essay_choice', prompt: SERVED.prompt, answer })
    if (t!.kind !== 'practice') throw new Error('unreachable')
    expect(t!.task.taskText).toContain(STORY)
    expect(t!.task.taskText).not.toContain(ESSAY_PROMPT_HEAD)
    expect(t!.task.essayText).toBe(`${STORY} So I told the office.`)
    expect(t!.task.kind).toBe('story')
  })

  it('routes an ISEE Essay to practice grading under the isee family', () => {
    const q = { type: 'essay', prompt: ISEE_PROMPT, passage: null }
    const [t] = plan([{ position: 3, question: q, student_answer: 'Alone, because...' }], 'isee-essay')
    expect(t).toMatchObject({ kind: 'practice', family: 'isee', type: 'essay', prompt: ISEE_PROMPT })
    if (t!.kind !== 'practice') throw new Error('unreachable')
    expect(t!.task.taskText).toBe(ISEE_PROMPT)
  })

  it('never grades a blank essay, including a pick with nothing written', () => {
    expect(plan([
      { position: 0, question: SERVED, student_answer: encodeEssayAnswer('Essay', '  ') },
      { position: 1, question: SERVED, student_answer: null },
      { position: 2, question: { type: 'essay', prompt: ISEE_PROMPT }, student_answer: '' },
    ], 'ssat-writing')).toEqual([])
  })

  it('still routes TOEFL rubric types as before, and skips audio-graded positions', () => {
    const email = { type: 'writing_email', prompt: '[Email] Reply.' }
    const interview = { type: 'speaking_interview', prompt: '[Interview] Q?' }
    const targets = plan([
      { position: 0, question: email, student_answer: ' Dear Sam, ... ' },
      { position: 1, question: interview, student_answer: 'I think...' },
      { position: 2, question: { type: 'multiple_choice', prompt: 'mc' }, student_answer: 'A' },
    ], 'toefl-writing', [1])
    expect(targets).toEqual([
      { kind: 'rubric', position: 0, type: 'writing_email', skill: 'writing', family: 'toefl', prompt: '[Email] Reply.', answer: 'Dear Sam, ...' },
    ])
  })

  it('a rubric type outside TOEFL/IELTS is still not rubric-graded', () => {
    expect(plan([{ position: 0, question: { type: 'writing_email', prompt: 'x' }, student_answer: 'y' }], 'ssat-writing')).toEqual([])
  })
})

describe('practice essays stay out of every score', () => {
  const essayQ = { type: 'essay_choice', prompt: SERVED.prompt, passage: SERVED.passage, correct_answer: '', choices: [] }
  const answer = encodeEssayAnswer('Essay', 'Schools should give places to anyone willing to work.')

  it('the key-scored denominator: total 0', () => {
    expect(weightedScore(essayQ as never, answer)).toEqual({ total: 0, correct: 0 })
    expect(weightedScore({ ...essayQ, type: 'essay' } as never, answer)).toEqual({ total: 0, correct: 0 })
  })

  it('the rubric half of the score split ignores a practice grade even when one exists', () => {
    const row: ResultRow = {
      question: essayQ as ResultRow['question'], studentAnswer: answer, correct: false, ungraded: true,
      isPilot: false, correctAnswerDisplay: '—', range: null, position: 0,
    }
    const grades: Record<string, RubricGrade> = {
      [SERVED.prompt]: { band: 4.5, scaleMax: 5, summary: 's', skill: 'writing', practice: true },
    }
    const s = scoreSplit([row], grades)
    expect(s.rubric).toMatchObject({ earned: 0, max: 0, graded: 0, pending: 0 })
    expect(s.hasRubric).toBe(false)
  })

  it('the TOEFL section scorer and the session-score decision ignore it', () => {
    expect(scoreItem({ type: 'essay_choice', studentAnswer: answer, rubricBand: 4.5 }, () => ({ score: 0 }))).toBeNull()
    // A banded practice essay is not "awaiting" and contributes nothing.
    const d = decideRubricSessionScore(
      [{ type: 'essay_choice', studentAnswer: answer, rubricBand: null }], 'writing', () => ({ score: 0 }))
    expect(d).toMatchObject({ score: null, ungraded: 0, reason: 'nothing scorable' })
  })
})
