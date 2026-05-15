import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: confirm caller is admin/super_admin. Returns the user id on
// success, or null if the auth check fails.
async function requireAdmin(request: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.substring(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return null

  const { data: userInfo } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!userInfo || !['admin', 'super_admin'].includes(userInfo.role)) {
    return null
  }
  return { userId: user.id }
}

// ---- GET /api/admin/academies ----
//
// Returns the full enriched academy list. Replaces the client-side direct
// queries that were failing with empty `{}` errors — those calls hit RLS
// because the regular browser client uses the anon key. Service role bypasses
// RLS so admin pages can see everything.
//
// The response shape matches what AcademyManagement expects: each row
// includes manager email/phone, subscription tier, user counts, last activity.
export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: academies, error } = await supabase
      .from('academies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Admin academies API] Fetch error:', error)
      return NextResponse.json({
        error: 'Failed to fetch academies',
        detail: error.message,
        code: error.code,
      }, { status: 500 })
    }

    // Pull supporting data in parallel — all admin-scoped, all service-role.
    const [
      { data: managers },
      { data: subscriptions },
      { data: students },
      { data: teachers },
      { data: parents },
    ] = await Promise.all([
      supabase
        .from('managers')
        .select('academy_id, phone, user_id, updated_at, users!inner(email)')
        .eq('active', true),
      supabase.from('academy_subscriptions').select('*'),
      supabase.from('students').select('academy_id, updated_at').eq('active', true),
      supabase.from('teachers').select('academy_id, updated_at').eq('active', true),
      supabase.from('parents').select('academy_id, updated_at').eq('active', true),
    ])

    type ManagerRow = {
      academy_id: string
      phone?: string
      user_id: string
      updated_at: string
      users: { email: string } | null
    }
    const managersByAcademy = new Map<string, ManagerRow>()
    for (const m of (managers || []) as unknown as ManagerRow[]) {
      if (!managersByAcademy.has(m.academy_id)) managersByAcademy.set(m.academy_id, m)
    }

    const subsByAcademy = new Map((subscriptions || []).map((s: { academy_id: string }) => [s.academy_id, s]))

    const countByAcademy = (rows: { academy_id: string }[] | null) => {
      const map: Record<string, number> = {}
      for (const r of rows || []) map[r.academy_id] = (map[r.academy_id] || 0) + 1
      return map
    }
    const studentCounts = countByAcademy(students)
    const teacherCounts = countByAcademy(teachers)
    const parentCounts = countByAcademy(parents)

    // Last activity = most recent updated_at across ALL user types.
    const lastActivityByAcademy: Record<string, string> = {}
    const collectActivity = (rows: { academy_id: string; updated_at: string }[] | null) => {
      for (const r of rows || []) {
        if (!r.updated_at) continue
        if (
          !lastActivityByAcademy[r.academy_id] ||
          new Date(r.updated_at) > new Date(lastActivityByAcademy[r.academy_id])
        ) {
          lastActivityByAcademy[r.academy_id] = r.updated_at
        }
      }
    }
    collectActivity(managers as unknown as { academy_id: string; updated_at: string }[])
    collectActivity(students)
    collectActivity(teachers)
    collectActivity(parents)

    const enriched = academies.map((academy) => {
      const sub = subsByAcademy.get(academy.id) as { plan_tier?: string; status?: string; monthly_amount?: number } | undefined
      const manager = managersByAcademy.get(academy.id)

      return {
        id: academy.id,
        name: academy.name || 'Unnamed Academy',
        email: manager?.users?.email || academy.email || null,
        phone: manager?.phone || academy.phone || null,
        address: academy.address || null,
        subscriptionTier: sub?.plan_tier || academy.subscription_tier || 'free',
        subscriptionStatus: sub?.status || (academy.is_suspended ? 'canceled' : 'active'),
        monthlyRevenue: sub?.monthly_amount || 0,
        isSuspended: academy.is_suspended || false,
        suspensionReason: academy.suspension_reason || null,
        totalUsers:
          (studentCounts[academy.id] || 0) +
          (teacherCounts[academy.id] || 0) +
          (parentCounts[academy.id] || 0),
        createdAt: academy.created_at,
        updatedAt: academy.updated_at,
        lastActive: lastActivityByAcademy[academy.id] || academy.created_at,
        // Onboarding state — admin UI uses these to show "Pending invite"
        // and offer a "Copy onboarding link" action for unfinished academies.
        onboardingToken: academy.onboarding_token || null,
        onboardingExpiresAt: academy.onboarding_token_expires_at || null,
        onboardingCompletedAt: academy.onboarding_completed_at || null,
        // Has the manager actually signed up yet? Two signals: an active
        // managers row exists, OR onboarding_completed_at is set.
        hasManager: !!manager,
      }
    })

    return NextResponse.json({ academies: enriched })
  } catch (e) {
    console.error('[Admin academies API] Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---- POST /api/admin/academies ----
//
// Body: { name: string, address?: string, subscriptionTier?: string }
//
// Creates a brand-new academy row, generates an onboarding token (32-byte
// hex, ~30-day expiry), and returns both the academy id + the onboarding
// URL the admin should send to the new manager.
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Academy name is required' }, { status: 400 })
    }

    const onboardingToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

    const { data, error } = await supabase
      .from('academies')
      .insert({
        name,
        address: typeof body.address === 'string' && body.address.trim().length > 0
          ? body.address.trim()
          : null,
        subscription_tier: typeof body.subscriptionTier === 'string'
          ? body.subscriptionTier
          : 'free',
        onboarding_token: onboardingToken,
        onboarding_token_expires_at: expiresAt,
      })
      .select('id, name, onboarding_token, onboarding_token_expires_at')
      .single()

    if (error || !data) {
      console.error('[Admin academies API] Create error:', error)
      return NextResponse.json({
        error: 'Failed to create academy',
        detail: error?.message,
        code: error?.code,
      }, { status: 500 })
    }

    // Build the public onboarding URL using the request's origin so it
    // works in local dev (app.localhost:3000), staging, and prod without
    // hardcoding a domain.
    const origin = request.headers.get('origin') || `https://${request.headers.get('host')}`
    const onboardingUrl = `${origin}/onboarding/${onboardingToken}`

    return NextResponse.json({
      academy: {
        id: data.id,
        name: data.name,
        onboardingToken: data.onboarding_token,
        onboardingExpiresAt: data.onboarding_token_expires_at,
        onboardingUrl,
      },
    }, { status: 201 })
  } catch (e) {
    console.error('[Admin academies API] Unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
