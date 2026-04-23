import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import {
  analyzeAttempt,
  type Difficulty,
  type Language,
  type QuestionType,
  type AnalysisFocus,
  type AnalysisLength,
  type AnalysisTone,
} from '@/lib/level-test-generator'

const VALID_FOCUS: AnalysisFocus[] = ['overall', 'strengths', 'weaknesses', 'study_plan', 'misconceptions']
const VALID_LENGTH: AnalysisLength[] = ['short', 'medium', 'detailed']
const VALID_TONE: AnalysisTone[] = ['encouraging', 'direct', 'formal']
const VALID_LANGUAGE: Language[] = ['english', 'korean']

// POST /api/level-tests/attempts/[attemptId]/analyze
// Generate an AI analysis of a submitted attempt
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse optional options from body (JSON; may be empty)
    let body: Record<string, unknown> = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is fine — use defaults
    }

    const focusOpt = typeof body.focus === 'string' && VALID_FOCUS.includes(body.focus as AnalysisFocus)
      ? (body.focus as AnalysisFocus)
      : undefined
    const lengthOpt = typeof body.length === 'string' && VALID_LENGTH.includes(body.length as AnalysisLength)
      ? (body.length as AnalysisLength)
      : undefined
    const toneOpt = typeof body.tone === 'string' && VALID_TONE.includes(body.tone as AnalysisTone)
      ? (body.tone as AnalysisTone)
      : undefined
    const analysisLangOpt = typeof body.analysis_language === 'string' && VALID_LANGUAGE.includes(body.analysis_language as Language)
      ? (body.analysis_language as Language)
      : undefined

    const { data: attempt } = await supabaseAdmin
      .from('level_test_attempts')
      .select(`
        id, test_id, taker_name, status, score, ai_analysis,
        level_tests!inner(
          academy_id, title, difficulty, language, extra_comments,
          subjects(name)
        )
      `)
      .eq('id', attemptId)
      .single()

    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    if (attempt.status === 'in_progress') {
      return NextResponse.json({ error: 'Attempt not submitted yet' }, { status: 400 })
    }

    const testInfo = attempt.level_tests as unknown as {
      academy_id: string
      title: string
      difficulty: Difficulty
      language: Language
      extra_comments: string | null
      subjects?: { name: string }
    }

    const { data: mgr } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('academy_id', testInfo.academy_id)
      .single()
    if (!mgr) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    // Collect questions + student answers
    const { data: answers } = await supabaseAdmin
      .from('level_test_answers')
      .select(`
        answer, is_correct,
        level_test_questions!inner(question, type, correct_answer, order_index)
      `)
      .eq('attempt_id', attemptId)

    if (!answers || answers.length === 0) {
      return NextResponse.json({ error: 'No answers found' }, { status: 400 })
    }

    const questions = answers
      .map(a => {
        const q = a.level_test_questions as unknown as {
          question: string
          type: QuestionType
          correct_answer: string
          order_index: number
        }
        return {
          question: q.question,
          type: q.type,
          correct_answer: q.correct_answer,
          student_answer: a.answer || '',
          is_correct: a.is_correct,
          order_index: q.order_index,
        }
      })
      .sort((a, b) => a.order_index - b.order_index)

    const analysis = await analyzeAttempt({
      testTitle: testInfo.title,
      subject: testInfo.subjects?.name || 'General',
      difficulty: testInfo.difficulty,
      language: testInfo.language,
      extraComments: testInfo.extra_comments,
      takerName: attempt.taker_name,
      totalScore: attempt.score,
      questions: questions.map(q => ({
        question: q.question,
        type: q.type,
        correct_answer: q.correct_answer,
        student_answer: q.student_answer,
        is_correct: q.is_correct,
      })),
      analysisLanguage: analysisLangOpt,
      focus: focusOpt,
      length: lengthOpt,
      tone: toneOpt,
    })

    await supabaseAdmin
      .from('level_test_attempts')
      .update({
        ai_analysis: analysis,
        ai_analysis_generated_at: new Date().toISOString(),
      })
      .eq('id', attemptId)

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('[attempt analyze] Exception:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET - just return existing analysis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: attempt } = await supabaseAdmin
      .from('level_test_attempts')
      .select('id, ai_analysis, ai_analysis_generated_at, level_tests!inner(academy_id)')
      .eq('id', attemptId)
      .single()
    if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const academyId = (attempt.level_tests as unknown as { academy_id: string })?.academy_id
    const { data: mgr } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('academy_id', academyId)
      .single()
    if (!mgr) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    return NextResponse.json({
      analysis: attempt.ai_analysis,
      generated_at: attempt.ai_analysis_generated_at,
    })
  } catch (error) {
    console.error('[attempt analyze GET] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
