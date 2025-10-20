import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
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
