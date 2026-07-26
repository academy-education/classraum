import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  // Auth gate. Previously this endpoint was fully public — service-role
  // INSERT into notifications meant anyone could spam any user with
  // arbitrary notification content (audit 2026-05-25, P0).
  //
  // Two accepted credentials:
  //   1. Bearer <user JWT> — browser callers via src/lib/notifications.ts
  //   2. x-internal-secret: CRON_SECRET_KEY — server-side loop-back from
  //      cron / webhook handlers that don't have a user context
  //
  // Accepts CRON_SECRET as well as the legacy CRON_SECRET_KEY. Reading
  // only the legacy name meant that on a deployment configured with just
  // CRON_SECRET — which is the name Vercel Cron actually requires — this
  // loop-back failed auth and every server-originated notification (the
  // welcome message among them) was rejected.
  const internalSecret = request.headers.get('x-internal-secret')
  const expectedInternal = process.env.CRON_SECRET || process.env.CRON_SECRET_KEY
  const hasInternalAuth = !!expectedInternal && internalSecret === expectedInternal
  if (!hasInternalAuth) {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const { notifications } = await request.json()

    if (!notifications || !Array.isArray(notifications)) {
      return NextResponse.json(
        { error: 'Invalid request: notifications array is required' },
        { status: 400 }
      )
    }

    // Validate each notification has required fields
    for (const notification of notifications) {
      if (!notification.user_id || !notification.type || !notification.title_key) {
        return NextResponse.json(
          { error: 'Invalid notification: user_id, type, and title_key are required' },
          { status: 400 }
        )
      }
    }

    // Insert notifications using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      console.error('Error creating notifications:', error)
      return NextResponse.json(
        { error: 'Failed to create notifications', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error) {
    console.error('Error in notification creation API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
