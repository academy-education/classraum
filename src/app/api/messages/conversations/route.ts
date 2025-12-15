import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List all conversations for the current user
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

    // Fetch conversations where user is a participant
    const { data: conversations, error } = await supabase
      .from('user_conversations')
      .select(`
        id,
        participant_1_id,
        participant_2_id,
        academy_id,
        created_at,
        updated_at
      `)
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[Messages API] Error fetching conversations:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    // Get the other participant's info and last message for each conversation
    const enrichedConversations = await Promise.all(
      (conversations || []).map(async (conv) => {
        const otherParticipantId = conv.participant_1_id === user.id
          ? conv.participant_2_id
          : conv.participant_1_id

        // Get other participant info
        const { data: otherUser } = await supabase
          .from('users')
          .select('id, name, email, role')
          .eq('id', otherParticipantId)
          .single()

        // Get last message
        const { data: lastMessage } = await supabase
          .from('user_messages')
          .select('id, message, sender_id, created_at, is_read')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Get unread count (messages from other user that are not read)
        const { count: unreadCount } = await supabase
          .from('user_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('sender_id', otherParticipantId)
          .eq('is_read', false)

        return {
          id: conv.id,
          participant: otherUser,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            message: lastMessage.message,
            senderId: lastMessage.sender_id,
            createdAt: lastMessage.created_at,
            isRead: lastMessage.is_read,
            isOwn: lastMessage.sender_id === user.id
          } : null,
          unreadCount: unreadCount || 0,
          createdAt: conv.created_at,
          updatedAt: conv.updated_at
        }
      })
    )

    return NextResponse.json({ conversations: enrichedConversations })
  } catch (error) {
    console.error('[Messages API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new conversation
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { participantId } = body

    if (!participantId) {
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 })
    }

    if (participantId === user.id) {
      return NextResponse.json({ error: 'Cannot create conversation with yourself' }, { status: 400 })
    }

    // Get user's academy
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // Find academy ID based on role
    let academyId: string | null = null

    if (userData?.role === 'manager') {
      const { data: manager } = await supabase
        .from('managers')
        .select('academy_id')
        .eq('user_id', user.id)
        .single()
      academyId = manager?.academy_id
    } else if (userData?.role === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('academy_id')
        .eq('user_id', user.id)
        .single()
      academyId = teacher?.academy_id
    } else if (userData?.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('academy_id')
        .eq('user_id', user.id)
        .single()
      academyId = student?.academy_id
    } else if (userData?.role === 'parent') {
      const { data: parent } = await supabase
        .from('parents')
        .select('academy_id')
        .eq('user_id', user.id)
        .single()
      academyId = parent?.academy_id
    }

    if (!academyId) {
      return NextResponse.json({ error: 'User is not associated with an academy' }, { status: 400 })
    }

    // Check if conversation already exists (order-independent)
    const { data: existingConv } = await supabase
      .from('user_conversations')
      .select('id')
      .eq('academy_id', academyId)
      .or(`and(participant_1_id.eq.${user.id},participant_2_id.eq.${participantId}),and(participant_1_id.eq.${participantId},participant_2_id.eq.${user.id})`)
      .single()

    if (existingConv) {
      // Return existing conversation
      return NextResponse.json({
        conversation: { id: existingConv.id },
        existing: true
      })
    }

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('user_conversations')
      .insert({
        participant_1_id: user.id,
        participant_2_id: participantId,
        academy_id: academyId
      })
      .select()
      .single()

    if (createError) {
      console.error('[Messages API] Error creating conversation:', createError)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json({
      conversation: newConv,
      existing: false
    }, { status: 201 })
  } catch (error) {
    console.error('[Messages API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
