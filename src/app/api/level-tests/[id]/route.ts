import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/level-tests/[id] - fetch test with questions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: test, error: testError } = await supabase
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

    const { data: questions, error: qError } = await supabase
      .from('level_test_questions')
      .select('*')
      .eq('test_id', id)
      .order('order_index', { ascending: true })

    if (qError) {
      return NextResponse.json({ error: qError.message }, { status: 500 })
    }

    // Parse choices JSON
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (typeof body.share_enabled === 'boolean') {
      updates.share_enabled = body.share_enabled
      if (body.share_enabled) {
        // Generate share token if enabling
        const { data: current } = await supabase
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

    const { data, error } = await supabase
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
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
