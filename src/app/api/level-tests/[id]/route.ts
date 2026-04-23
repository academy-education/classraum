import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

async function isManagerForTest(userId: string, testId: string): Promise<boolean> {
  const { data: test } = await supabaseAdmin
    .from('level_tests')
    .select('academy_id')
    .eq('id', testId)
    .single()
  if (!test) return false
  const { data: mgr } = await supabaseAdmin
    .from('managers')
    .select('user_id')
    .eq('user_id', userId)
    .eq('academy_id', test.academy_id)
    .single()
  return !!mgr
}

// GET /api/level-tests/[id] - fetch test with questions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await isManagerForTest(user.id, id))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: test, error: testError } = await supabaseAdmin
      .from('level_tests')
      .select(`
        *,
        subjects(id, name)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (testError || !test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    const { data: questions, error: qError } = await supabaseAdmin
      .from('level_test_questions')
      .select('*')
      .eq('test_id', id)
      .order('order_index', { ascending: true })

    if (qError) {
      return NextResponse.json({ error: qError.message }, { status: 500 })
    }

    const parsedQuestions = (questions || []).map(q => ({
      ...q,
      choices: q.choices ? (typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices) : null,
    }))

    return NextResponse.json({ test, questions: parsedQuestions })
  } catch (error) {
    console.error('[level-tests GET by id] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/level-tests/[id] - update test (toggle share, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await isManagerForTest(user.id, id))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.share_enabled === 'boolean') {
      updates.share_enabled = body.share_enabled
      if (body.share_enabled) {
        const { data: current } = await supabaseAdmin
          .from('level_tests')
          .select('share_token')
          .eq('id', id)
          .single()
        if (!current?.share_token) {
          const { randomBytes } = await import('crypto')
          updates.share_token = randomBytes(16).toString('hex')
        }
      }
    }

    if (typeof body.title === 'string') {
      updates.title = body.title
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('level_tests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ test: data })
  } catch (error) {
    console.error('[level-tests PATCH] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/level-tests/[id] - soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await isManagerForTest(user.id, id))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await supabaseAdmin
      .from('level_tests')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[level-tests DELETE] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
