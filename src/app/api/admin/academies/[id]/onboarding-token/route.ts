import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: confirm caller is admin/super_admin. Returns the user id on success.
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

// ---- POST /api/admin/academies/[id]/onboarding-token ----
//
// Regenerate the onboarding token for an academy whose original token has
// expired or whose admin needs to re-issue the link. Refuses if onboarding
// has already been completed (we don't want to let a manager get re-onboarded
// behind their back).
//
// Returns the fresh token + URL.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Academy id required' }, { status: 400 })
  }

  // Confirm the academy exists and isn't already past onboarding.
  const { data: academy, error: fetchError } = await supabase
    .from('academies')
    .select('id, name, onboarding_completed_at')
    .eq('id', id)
    .single()

  if (fetchError || !academy) {
    return NextResponse.json({ error: 'Academy not found' }, { status: 404 })
  }

  if (academy.onboarding_completed_at) {
    return NextResponse.json({
      error: 'Onboarding has already been completed for this academy. Cannot regenerate token.',
    }, { status: 409 })
  }

  // Mint a new token. 32 bytes hex = 64 chars, opaque & unguessable.
  // Keep the same 30-day window as the original.
  const onboardingToken = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error: updateError } = await supabase
    .from('academies')
    .update({
      onboarding_token: onboardingToken,
      onboarding_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    console.error('[Admin academies API] Regenerate token error:', updateError)
    return NextResponse.json({
      error: 'Failed to regenerate onboarding token',
      detail: updateError.message,
    }, { status: 500 })
  }

  const origin = request.headers.get('origin') || `https://${request.headers.get('host')}`
  const onboardingUrl = `${origin}/onboarding/${onboardingToken}`

  return NextResponse.json({
    academy: {
      id: academy.id,
      name: academy.name,
      onboardingToken,
      onboardingExpiresAt: expiresAt,
      onboardingUrl,
    },
  })
}

// ---- DELETE /api/admin/academies/[id]/onboarding-token ----
//
// Revoke an outstanding onboarding token. Use case: admin sent the link to
// the wrong person and wants to kill it without minting a new one (e.g.
// they'll regenerate later, or they're decommissioning the academy).
// Refuses if onboarding has already been completed — the token is already
// nulled in that case and the call is a no-op anyway.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Academy id required' }, { status: 400 })
  }

  const { data: academy, error: fetchError } = await supabase
    .from('academies')
    .select('id, name, onboarding_token, onboarding_completed_at')
    .eq('id', id)
    .single()

  if (fetchError || !academy) {
    return NextResponse.json({ error: 'Academy not found' }, { status: 404 })
  }

  if (academy.onboarding_completed_at) {
    return NextResponse.json({
      error: 'Onboarding has already been completed for this academy.',
    }, { status: 409 })
  }

  if (!academy.onboarding_token) {
    // Already revoked / never had one — treat as success so the UI can
    // refresh without a confusing error toast.
    return NextResponse.json({ ok: true })
  }

  const { error: updateError } = await supabase
    .from('academies')
    .update({
      onboarding_token: null,
      onboarding_token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    console.error('[Admin academies API] Revoke token error:', updateError)
    return NextResponse.json({
      error: 'Failed to revoke onboarding token',
      detail: updateError.message,
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
