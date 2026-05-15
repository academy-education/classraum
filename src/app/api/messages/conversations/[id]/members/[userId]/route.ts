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

// DELETE /api/messages/conversations/[id]/members/[userId]
//
// Two cases, both handled here:
//   1. userId === auth.uid()  → "leave group" (any member can leave themselves)
//   2. userId !== auth.uid()  → "remove member" (any member can remove anyone)
//
// We don't have a separate "owner" concept — matches the existing flat
// conversation_participants table. If/when the academy admin needs special
// powers, the row-level check below is the place to enforce it.
//
// Generates a system message:
//   - 'left' if the actor removed themselves
//   - 'member_removed' otherwise
//
// If the last member leaves a group we keep the conversation around as a
// historical record (no auto-delete). The deleted member just won't see it
// in their list anymore.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: conversationId, userId: targetUserId } = await params

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

    const { data: conv } = await supabase
      .from('user_conversations')
      .select('id, is_group')
      .eq('id', conversationId)
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }
    if (!conv.is_group) {
      return NextResponse.json({
        error: 'Cannot remove members from a 1:1 conversation. Delete the conversation instead.'
      }, { status: 400 })
    }

    // Verify the target is actually a member (otherwise the operation is a no-op).
    if (!(await isParticipant(conversationId, targetUserId))) {
      return NextResponse.json({ error: 'User is not a member of this conversation' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', targetUserId)

    if (deleteError) {
      console.error('[Messages API] Error removing member:', deleteError)
      return NextResponse.json({
        error: 'Failed to remove member',
        detail: deleteError.message,
      }, { status: 500 })
    }

    // Look up names for the system message payload.
    const { data: usersInfo } = await supabase
      .from('users')
      .select('id, name')
      .in('id', [user.id, targetUserId])

    const nameOf = (id: string) => usersInfo?.find(u => u.id === id)?.name || null

    if (targetUserId === user.id) {
      await appendSystemMessage(conversationId, user.id, 'left', {
        actorId: user.id,
        actorName: nameOf(user.id),
      })
    } else {
      await appendSystemMessage(conversationId, user.id, 'member_removed', {
        actorId: user.id,
        actorName: nameOf(user.id),
        targetId: targetUserId,
        targetName: nameOf(targetUserId),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Messages API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
