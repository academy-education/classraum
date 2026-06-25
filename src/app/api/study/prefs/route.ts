import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/study/prefs — returns the student's stored study prefs,
 * auto-creating a default row if none exists. The default row
 * persists onboarded_at=null so the landing knows to show the
 * onboarding wizard.
 *
 * PUT /api/study/prefs — partial update. Body is a subset of the
 * StudyUserPrefs fields; updated_at is bumped automatically.
 */

export const dynamic = 'force-dynamic'

export interface StudyUserPrefs {
  student_id: string
  target_test: string | null
  grade_level: string | null
  daily_goal_minutes: number
  default_language: 'en' | 'ko'
  default_difficulty: 'warmup' | 'balanced' | 'challenge'
  onboarded_at: string | null
  updated_at: string
}

async function authedUser(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

export async function GET(req: NextRequest) {
  const user = await authedUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: existing } = await supabaseAdmin
    .from('study_user_prefs')
    .select('*')
    .eq('student_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ prefs: existing })

  // Auto-create default row.
  const { data: created } = await supabaseAdmin
    .from('study_user_prefs')
    .insert({ student_id: user.id })
    .select()
    .single()
  return NextResponse.json({ prefs: created })
}

export async function PUT(req: NextRequest) {
  const user = await authedUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Partial<StudyUserPrefs> = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  // Whitelist mutable fields. student_id / created_at are never user-settable.
  const allowed: (keyof StudyUserPrefs)[] = [
    'target_test', 'grade_level', 'daily_goal_minutes',
    'default_language', 'default_difficulty', 'onboarded_at',
  ]
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  // Upsert so first-time PUT (before any GET) still works.
  const { data, error } = await supabaseAdmin
    .from('study_user_prefs')
    .upsert({ student_id: user.id, ...patch }, { onConflict: 'student_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prefs: data })
}
