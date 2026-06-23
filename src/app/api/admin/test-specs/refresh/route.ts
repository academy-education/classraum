import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  refreshTestSpec,
  refreshTestSpecExamples,
  listAllSpecTargetsFromDB,
} from '@/lib/test-spec-refresh'

/**
 * POST /api/admin/test-specs/refresh — manually refresh the test
 * spec cache. Platform-admin only (Classraum staff, not academy
 * managers).
 *
 * Targets are derived from study_topics (any test_prep leaf) so a new
 * test in the catalog is automatically refreshable — no code change.
 *
 * Body (all optional):
 *   {
 *     family?: string,        // restrict to one family (e.g. "sat")
 *     sectionKey?: string,    // restrict to one section
 *     force?: boolean,        // bypass 30-day skip
 *     withExamples?: boolean, // ALSO run the expensive sample-pull pass
 *     exampleCount?: number,  // target N examples per section (default 8)
 *   }
 *
 * - family only: refresh all sections of that family
 * - family + sectionKey: refresh that single pair
 * - neither: refresh everything in the catalog
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

  let body: {
    family?: string
    sectionKey?: string
    force?: boolean
    withExamples?: boolean
    exampleCount?: number
  } = {}
  try { body = await req.json() } catch { /* empty body is fine */ }

  // Admin endpoint bypasses the cron skip list — manual force is the
  // whole point of having an admin endpoint, even for families like
  // SAT whose sanity check will likely reject the result.
  const allTargets = await listAllSpecTargetsFromDB({ includeSkipped: true })
  const targets = allTargets
    .filter(t => !body.family || t.family === body.family)
    .filter(t => !body.sectionKey || t.sectionKey === body.sectionKey)

  if (targets.length === 0) {
    return NextResponse.json({ error: 'no matching targets', allTargetsCount: allTargets.length }, { status: 400 })
  }

  const formatResults = []
  const sampleResults = []
  for (const t of targets) {
    const formatResult = await refreshTestSpec(t, { force: body.force })
    formatResults.push(formatResult)

    if (body.withExamples) {
      const samplesResult = await refreshTestSpecExamples(t, {
        force: body.force,
        targetCount: body.exampleCount ?? 8,
      })
      sampleResults.push(samplesResult)
    }
  }

  return NextResponse.json({
    targets: targets.length,
    formatOk: formatResults.filter(r => r.ok).length,
    formatFailed: formatResults.filter(r => !r.ok).length,
    samplesOk: sampleResults.filter(r => r.ok).length,
    samplesFailed: sampleResults.filter(r => !r.ok).length,
    examplesAdded: sampleResults.reduce((sum, r) => sum + r.examplesAdded, 0),
    formatResults,
    sampleResults,
  })
}
