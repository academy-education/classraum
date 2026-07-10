import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Read-only browser for the `study_item_bank` table (SAT question bank).
 * Paginated + filterable. Gated by a small email allowlist (plus platform
 * admins) via the standard bearer-token pattern (see src/lib/api-auth.ts) —
 * the target reviewer is a `student` role, so role-gating alone won't do.
 */

const ALLOWED_EMAILS = new Set([
  'raphael.student@gmail.com',
  'leeandy755@gmail.com',
])

const PAGE_SIZE_DEFAULT = 25
const PAGE_SIZE_MAX = 100

// Strip characters that would break a PostgREST `.or()` / `.ilike` filter.
const cleanSearch = (s: string) => s.replace(/[,()%*]/g, ' ').trim().slice(0, 120)

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const emailOk = user.email ? ALLOWED_EMAILS.has(user.email.toLowerCase()) : false
  let roleOk = false
  if (!emailOk) {
    const { data: me } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single()
    roleOk = me?.role === 'admin' || me?.role === 'super_admin'
  }
  if (!emailOk && !roleOk) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const p = new URL(req.url).searchParams
  const page = Math.max(1, parseInt(p.get('page') || '1', 10) || 1)
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(p.get('pageSize') || String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const section = p.get('section') || ''      // reading_writing | math | ''
  const domain = p.get('domain') || ''
  const difficulty = p.get('difficulty') || '' // hard | medium | easy | ''
  const source = p.get('source') || ''         // hand | generated | ''
  const cohort = p.get('cohort') ?? 'v2'        // v2 | legacy | all
  const archived = p.get('archived') ?? 'false' // true | false | all
  const verified = p.get('verified') ?? 'true'  // true | false | all
  const q = cleanSearch(p.get('q') || '')

  let query = supabaseAdmin
    .from('study_item_bank')
    .select('id, section, domain, subskill, difficulty, topic_tag, cohort, archived, verified, source, created_at, item', { count: 'exact' })
    .eq('family', 'sat')

  if (section) query = query.eq('section', section)
  if (domain) query = query.eq('domain', domain)
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (source) query = query.eq('source', source)
  if (cohort !== 'all') query = query.eq('cohort', cohort)
  if (archived !== 'all') query = query.eq('archived', archived === 'true')
  if (verified !== 'all') query = query.eq('verified', verified === 'true')
  if (q) query = query.or(`item->>prompt.ilike.%${q}%,item->>passage.ilike.%${q}%,subskill.ilike.%${q}%,topic_tag.ilike.%${q}%`)

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = count ?? 0
  return NextResponse.json({
    items: data ?? [],
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  })
}
