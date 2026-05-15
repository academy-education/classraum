import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

async function appendSystemMessage(
  conversationId: string,
  actorId: string,
  systemType: string,
  systemMeta: Record<string, unknown>
) {
  await supabase.from('user_messages').insert({
    conversation_id: conversationId,
    sender_id: actorId,
    message: null,
    system_type: systemType,
    system_meta: systemMeta,
    is_read: true,
  })
  await supabase
    .from('user_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
}

// POST /api/messages/conversations/[id]/members
//   Body: { userIds: string[] }
//
// Adds one or more new members to a group conversation. Skips users that
// are already members (idempotent). Generates one system message per added
// user so the chat timeline shows "Alice added Bob to the group".
//
// Caller must already be a member.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params

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

    // Conversation must be a group — adding members to a 1:1 doesn't make sense.
    const { data: conv } = await supabase
      .from('user_conversations')
      .select('id, is_group, academy_id')
      .eq('id', conversationId)
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    if (!conv.is_group) {
      return NextResponse.json({
        error: 'Cannot add members to a 1:1 conversation. Create a new group instead.'
      }, { status: 400 })
    }

    const body = await request.json()
    const requestedIds: string[] = Array.isArray(body.userIds) ? body.userIds : []
    const cleanIds = Array.from(new Set(requestedIds.filter(
      (id: string) => typeof id === 'string' && id.length > 0
    )))

    if (cleanIds.length === 0) {
      return NextResponse.json({ error: 'No users to add' }, { status: 400 })
    }

    // Filter out users who are already members (idempotent add).
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .in('user_id', cleanIds)

    const existingIds = new Set((existing || []).map(r => r.user_id))
    const newIds = cleanIds.filter(id => !existingIds.has(id))

    if (newIds.length === 0) {
      return NextResponse.json({ added: [], alreadyMembers: cleanIds })
    }

    // Insert membership rows.
    const { error: insertError } = await supabase
      .from('conversation_participants')
      .insert(newIds.map(id => ({ conversation_id: conversationId, user_id: id })))

    if (insertError) {
      console.error('[Messages API] Error adding members:', insertError)
      return NextResponse.json({
        error: 'Failed to add members',
        detail: insertError.message,
      }, { status: 500 })
    }

    // Look up user names for actor + targets so the system message's payload
    // is self-contained (clients render directly without a follow-up lookup).
    const { data: usersInfo } = await supabase
      .from('users')
      .select('id, name')
      .in('id', [user.id, ...newIds])

    const nameOf = (id: string) => usersInfo?.find(u => u.id === id)?.name || null

    // One system message per added user — matches Slack/WhatsApp.
    await Promise.all(newIds.map(targetId =>
      appendSystemMessage(conversationId, user.id, 'member_added', {
        actorId: user.id,
        actorName: nameOf(user.id),
        targetId,
        targetName: nameOf(targetId),
      })
    ))

    return NextResponse.json({
      added: newIds,
      alreadyMembers: cleanIds.filter(id => existingIds.has(id)),
    })
  } catch (error) {
    console.error('[Messages API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
