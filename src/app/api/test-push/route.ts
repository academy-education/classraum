import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/notifications'

// Use service role to bypass RLS for testing
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, title, message } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const notificationTitle = title || '🔔 Test Push Notification'
    const notificationMessage = message || 'This is a test push notification from Classraum!'

    // Step 1: Check if user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        error: 'User not found',
        userId
      }, { status: 404 })
    }

    // Step 2: Check for device tokens
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('device_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (tokensError) {
      return NextResponse.json({
        error: 'Failed to fetch device tokens',
        details: tokensError.message
      }, { status: 500 })
    }

    // Step 3: Create in-app notification
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'system',
        title_key: 'test.pushNotification.title',
        message_key: 'test.pushNotification.message',
        is_read: false
      })
      .select()
      .single()

    if (notifError) {
      console.error('Failed to create in-app notification:', notifError)
    }

    // Step 4: Send push notification
    let pushResult = { success: false, sent: 0, failed: 0, error: null as string | null }

    if (tokens && tokens.length > 0) {
      pushResult = await sendPushNotification(
        [userId],
        notificationTitle,
        notificationMessage,
        { type: 'test', timestamp: new Date().toISOString() }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      deviceTokens: {
        count: tokens?.length || 0,
        tokens: tokens?.map(t => ({
          platform: t.platform,
          isActive: t.is_active,
          lastUsed: t.last_used_at,
          tokenPreview: t.token.substring(0, 20) + '...'
        })) || []
      },
      inAppNotification: notification ? {
        id: notification.id,
        created: true
      } : {
        created: false,
        error: notifError?.message
      },
      pushNotification: {
        attempted: (tokens?.length || 0) > 0,
        ...pushResult
      },
      message: tokens?.length
        ? `Push notification sent to ${tokens.length} device(s)`
        : 'No active device tokens found - in-app notification created only',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[TEST-PUSH] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send test notification',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // Check device tokens summary
  const { data: tokenStats, error: statsError } = await supabaseAdmin
    .from('device_tokens')
    .select('platform, is_active, user_id')

  const stats = {
    total: tokenStats?.length || 0,
    active: tokenStats?.filter(t => t.is_active).length || 0,
    byPlatform: {
      ios: tokenStats?.filter(t => t.platform === 'ios').length || 0,
      android: tokenStats?.filter(t => t.platform === 'android').length || 0,
      web: tokenStats?.filter(t => t.platform === 'web').length || 0
    },
    uniqueUsers: new Set(tokenStats?.map(t => t.user_id)).size
  }

  return NextResponse.json({
    message: 'Push Notification Test API',
    description: 'Send a test push notification to a specific user',
    usage: {
      method: 'POST',
      body: {
        userId: 'required - UUID of the user to send notification to',
        title: 'optional - Custom notification title',
        message: 'optional - Custom notification message'
      }
    },
    example: {
      userId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      title: 'Test Notification',
      message: 'Hello from Classraum!'
    },
    currentStats: stats,
    timestamp: new Date().toISOString()
  })
}
