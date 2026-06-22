import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { refreshTestSpec, listAllSpecTargets } from '@/lib/test-spec-refresh'
import type { TestFamily } from '@/lib/study-prompt-context'

/**
 * POST /api/admin/test-specs/refresh — manually refresh the test
 * spec cache. Platform-admin only (Classraum staff, not academy
 * managers). Each call walks every (family, section) pair from the
 * hardcoded TEST_SPECS, skipping rows verified within 30 days.
 *
 * Body (all optional):
 *   { family?: string, sectionKey?: string, force?: boolean }
 *
 * - family only: refresh all sections of that family.
 * - family + sectionKey: refresh that single pair.
 * - neither: refresh everything.
 * - force=true: bypass the 30-day skip check.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (me?.role !== 'admin' && me?.role !== 'super_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: { family?: string; sectionKey?: string; force?: boolean } = {}
  try { body = await req.json() } catch { /* empty body is fine */ }

  const targets = listAllSpecTargets()
    .filter(t => !body.family || t.family === body.family)
    .filter(t => !body.sectionKey || t.sectionKey === body.sectionKey)

  if (targets.length === 0) {
    return NextResponse.json({ error: 'no matching targets' }, { status: 400 })
  }

  const results = []
  for (const t of targets) {
    const r = await refreshTestSpec(t.family as TestFamily, t.sectionKey, { force: body.force })
    results.push(r)
  }

  return NextResponse.json({
    ran: results.length,
    ok: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results,
  })
}
