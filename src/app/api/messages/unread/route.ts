import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Get total unread message count for the current user
export async function GET(request: NextRequest) {
  try {
    // Get user from Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get all conversations where user is a participant
    const { data: conversations, error: convError } = await supabase
      .from('user_conversations')
      .select('id, participant_1_id, participant_2_id')
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)

    if (convError) {
      console.error('[Unread API] Error fetching conversations:', convError)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ unreadCount: 0 })
    }

    // Get conversation IDs
    const conversationIds = conversations.map(c => c.id)

    // Count all unread messages where sender is not the current user
    const { count, error: countError } = await supabase
      .from('user_messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', user.id)
      .eq('is_read', false)

    if (countError) {
      console.error('[Unread API] Error counting unread messages:', countError)
      return NextResponse.json({ error: 'Failed to count unread messages' }, { status: 500 })
    }

    return NextResponse.json({ unreadCount: count || 0 })
  } catch (error) {
    console.error('[Unread API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
