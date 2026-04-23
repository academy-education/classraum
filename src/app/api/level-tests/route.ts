import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'
import { generateLevelTest, type GenerateTestParams } from '@/lib/level-test-generator'

// GET /api/level-tests - list manager's tests
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get academies this user manages
    const { data: managerRows } = await supabaseAdmin
      .from('managers')
      .select('academy_id')
      .eq('user_id', user.id)

    const academyIds = (managerRows || []).map(r => r.academy_id)
    if (academyIds.length === 0) {
      return NextResponse.json({ tests: [] })
    }

    const { data, error } = await supabaseAdmin
      .from('level_tests')
      .select(`
        id, title, grade, difficulty, language, question_count,
        question_types, share_enabled, share_token, created_at,
        subjects(id, name)
      `)
      .in('academy_id', academyIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[level-tests GET] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tests: data })
  } catch (error) {
    console.error('[level-tests GET] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/level-tests - generate and save a new test
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      academy_id,
      subject_id,
      subject_name,
      grade,
      difficulty,
      language,
      question_types,
      question_count,
      mc_choice_count,
      time_limit_minutes,
      extra_comments,
    } = body

    if (!academy_id || !subject_name || !difficulty || !Array.isArray(question_types) || question_types.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (question_count < 5 || question_count > 50) {
      return NextResponse.json({ error: 'Question count must be between 5 and 50' }, { status: 400 })
    }
    if (mc_choice_count < 2 || mc_choice_count > 6) {
      return NextResponse.json({ error: 'Choice count must be between 2 and 6' }, { status: 400 })
    }

    // Verify user is a manager in this academy
    const { data: managerCheck } = await supabaseAdmin
      .from('managers')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('academy_id', academy_id)
      .single()

    if (!managerCheck) {
      return NextResponse.json({ error: 'Not authorized for this academy' }, { status: 403 })
    }

    const params: GenerateTestParams = {
      subject: subject_name,
      grade,
      difficulty,
      language,
      questionTypes: question_types,
      questionCount: question_count,
      mcChoiceCount: mc_choice_count,
    }

    const generated = await generateLevelTest(params)

    const { data: test, error: testError } = await supabaseAdmin
      .from('level_tests')
      .insert({
        academy_id,
        created_by: user.id,
        title: generated.title,
        subject_id: subject_id || null,
        grade: grade || null,
        difficulty,
        language,
        question_types,
        question_count,
        mc_choice_count,
        time_limit_minutes: time_limit_minutes || null,
        extra_comments: extra_comments || null,
      })
      .select()
      .single()

    if (testError || !test) {
      console.error('[level-tests POST] Insert error:', testError)
      return NextResponse.json({ error: testError?.message || 'Failed to save test' }, { status: 500 })
    }

    const questionRows = generated.questions.map((q, i) => ({
      test_id: test.id,
      order_index: i,
      type: q.type,
      question: q.question,
      choices: q.choices ? JSON.stringify(q.choices) : null,
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
    }))

    const { error: questionsError } = await supabaseAdmin
      .from('level_test_questions')
      .insert(questionRows)

    if (questionsError) {
      console.error('[level-tests POST] Questions insert error:', questionsError)
      await supabaseAdmin.from('level_tests').delete().eq('id', test.id)
      return NextResponse.json({ error: questionsError.message }, { status: 500 })
    }

    return NextResponse.json({ test, questions: generated.questions })
  } catch (error) {
    console.error('[level-tests POST] Exception:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
