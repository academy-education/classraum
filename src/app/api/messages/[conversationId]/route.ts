import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params

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

    // Verify user is a participant in this conversation
    const { data: conversation } = await supabase
      .from('user_conversations')
      .select('id, participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.participant_1_id !== user.id && conversation.participant_2_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch messages
    const { data: messages, error } = await supabase
      .from('user_messages')
      .select(`
        id,
        sender_id,
        message,
        is_read,
        created_at
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Messages API] Error fetching messages:', error)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Mark messages from the other user as read
    const otherParticipantId = conversation.participant_1_id === user.id
      ? conversation.participant_2_id
      : conversation.participant_1_id

    await supabase
      .from('user_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_id', otherParticipantId)
      .eq('is_read', false)

    // Transform messages
    const transformedMessages = (messages || []).map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      message: msg.message,
      isRead: msg.is_read,
      createdAt: msg.created_at,
      isOwn: msg.sender_id === user.id
    }))

    return NextResponse.json({ messages: transformedMessages })
  } catch (error) {
    console.error('[Messages API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params

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

    // Verify user is a participant in this conversation
    const { data: conversation } = await supabase
      .from('user_conversations')
      .select('id, participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (conversation.participant_1_id !== user.id && conversation.participant_2_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { message } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Insert message
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
