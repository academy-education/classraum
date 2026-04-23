import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/test/[shareToken] - public: fetch test without correct answers
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params
  try {
    const { data: test, error: testError } = await supabaseAdmin
      .from('level_tests')
      .select('id, title, question_count, time_limit_minutes, language, share_enabled')
      .eq('share_token', shareToken)
      .is('deleted_at', null)
      .single()

    if (testError || !test || !test.share_enabled) {
      return NextResponse.json({ error: 'Test not found or sharing disabled' }, { status: 404 })
    }

    const { data: questions, error: qError } = await supabaseAdmin
      .from('level_test_questions')
      .select('id, order_index, type, question, choices')
      .eq('test_id', test.id)
      .order('order_index', { ascending: true })

    if (qError) {
      return NextResponse.json({ error: qError.message }, { status: 500 })
    }

    // Parse choices, strip correct_answer
    const safeQuestions = (questions || []).map(q => ({
      ...q,
      choices: q.choices ? (typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices) : null,
    }))

    return NextResponse.json({ test, questions: safeQuestions })
  } catch (error) {
    console.error('[public test GET] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
