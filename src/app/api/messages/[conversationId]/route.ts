import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ---- Helpers ----

/**
 * Returns true if `userId` is a participant in `conversationId`.
 * Uses the conversation_participants join table so it works for both 1:1
 * DMs and group chats.
 */
async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

// ---- GET /api/messages/[conversationId] ----

// Fetch all messages in a conversation. Marks unread messages from other
// participants as read once the user opens the chat.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!(await isParticipant(conversationId, user.id))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch messages. `system_type` + `system_meta` are non-null for system
    // messages (member_added / removed / left / renamed / avatar_changed).
    const { data: messages, error } = await supabase
      .from('user_messages')
      .select(`
        id,
        sender_id,
        message,
        is_read,
        created_at,
        system_type,
        system_meta
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Messages API] Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Mark every unread message NOT sent by the current user as read. Works
    // identically for 1:1 (one other participant) and group chats (many).
    await supabase
      .from('user_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false)

    const transformedMessages = (messages || []).map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      message: msg.message,
      isRead: msg.is_read,
      createdAt: msg.created_at,
      isOwn: msg.sender_id === user.id,
      systemType: msg.system_type,
      systemMeta: msg.system_meta,
    }))

    return NextResponse.json({ messages: transformedMessages })
  } catch (error) {
    console.error('[Messages API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---- POST /api/messages/[conversationId] ----

// Send a message. Requires the sender to be a participant.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params

    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!(await isParticipant(conversationId, user.id))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { message } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Insert message + bump the conversation's updated_at so it sorts to
    // the top of the conversation list.
    const { data: newMessage, error: insertError } = await supabase
      .from('user_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message: message.trim(),
        is_read: false
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Messages API] Error sending message:', insertError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    await supabase
      .from('user_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    return NextResponse.json({
      message: {
        id: newMessage.id,
        senderId: newMessage.sender_id,
        message: newMessage.message,
        isRead: newMessage.is_read,
        createdAt: newMessage.created_at,
        isOwn: true
      }
    }, { status: 201 })
  } catch (error) {
    console.error('[Messages API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
