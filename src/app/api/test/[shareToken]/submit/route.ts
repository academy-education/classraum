import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { triggerLevelTestSubmittedNotifications } from '@/lib/notification-triggers'

// POST /api/test/[shareToken]/submit - submit answers, auto-grade MC/TF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params
  try {
    const body = await request.json()
    const { taker_name, taker_email, answers } = body

    if (!taker_name || typeof taker_name !== 'string' || taker_name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers must be an array' }, { status: 400 })
    }

    // Verify test exists and share is enabled
    const { data: test, error: testError } = await supabaseAdmin
      .from('level_tests')
      .select('id, share_enabled')
      .eq('share_token', shareToken)
      .is('deleted_at', null)
      .single()

    if (testError || !test || !test.share_enabled) {
      return NextResponse.json({ error: 'Test not found or sharing disabled' }, { status: 404 })
    }

    // Fetch questions with correct answers for grading
    const { data: questions } = await supabaseAdmin
      .from('level_test_questions')
      .select('id, type, correct_answer')
      .eq('test_id', test.id)

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'Test has no questions' }, { status: 500 })
    }

    const questionMap = new Map(questions.map(q => [q.id, q]))

    // Grade each answer
    let correctCount = 0
    let autoGradedCount = 0
    let needsManualGrading = false
    const gradedAnswers: Array<{
      question_id: string
      answer: string
      is_correct: boolean | null
    }> = []

    for (const ans of answers) {
      const q = questionMap.get(ans.question_id)
      if (!q) continue

      const submitted = (ans.answer || '').toString().trim()
      let isCorrect: boolean | null = null

      if (q.type === 'multiple_choice') {
        isCorrect = submitted === q.correct_answer
        if (isCorrect) correctCount++
        autoGradedCount++
      } else if (q.type === 'true_false') {
        isCorrect = submitted.toLowerCase() === q.correct_answer.toLowerCase()
        if (isCorrect) correctCount++
        autoGradedCount++
      } else if (q.type === 'short_answer') {
        // Needs manual grading
        needsManualGrading = true
      }

      gradedAnswers.push({
        question_id: ans.question_id,
        answer: submitted,
        is_correct: isCorrect,
      })
    }

    // Calculate score: percentage of auto-gradable correct
    const score = autoGradedCount > 0
      ? Math.round((correctCount / questions.length) * 10000) / 100
      : null

    // Create attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('level_test_attempts')
      .insert({
        test_id: test.id,
        share_token: shareToken,
        taker_name: taker_name.trim(),
        taker_email: taker_email || null,
        submitted_at: new Date().toISOString(),
        score,
        total_questions: questions.length,
        status: needsManualGrading ? 'submitted' : 'graded',
        needs_manual_grading: needsManualGrading,
      })
      .select()
      .single()

    if (attemptError || !attempt) {
      console.error('[public test submit] Attempt insert error:', attemptError)
      return NextResponse.json({ error: 'Failed to record attempt' }, { status: 500 })
    }

    // Insert answers
    const answerRows = gradedAnswers.map(a => ({
      attempt_id: attempt.id,
      question_id: a.question_id,
      answer: a.answer,
      is_correct: a.is_correct,
    }))

    const { error: answerError } = await supabaseAdmin
      .from('level_test_answers')
      .insert(answerRows)

    if (answerError) {
      console.error('[public test submit] Answer insert error:', answerError)
    }

    // Fire managers' notifications — best-effort, don't block the response
    // or fail the submit if notifications error out.
    triggerLevelTestSubmittedNotifications(attempt.id).catch(err =>
      console.error('[public test submit] notification dispatch failed:', err)
    )

    return NextResponse.json({
      attempt_id: attempt.id,
      auto_graded: autoGradedCount,
      correct: correctCount,
      total: questions.length,
      score,
      needs_manual_grading: needsManualGrading,
    })
  } catch (error) {
    console.error('[public test submit] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
