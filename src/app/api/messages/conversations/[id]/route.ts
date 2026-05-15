import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: confirm the requesting user is a member of the conversation
async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

// Helper: insert a system message into the chat timeline so members see
// "Alice renamed the group to X" inline. Bumps the conversation's
// updated_at so it sorts to the top.
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

// PATCH /api/messages/conversations/[id]
//   Body: { name?: string | null, avatarUrl?: string | null }
//   - name: rename the group. Pass an empty string or null to clear.
//   - avatarUrl: replace the group avatar. Pass null to remove.
//
// Any member can rename / change avatar (matches Slack/WhatsApp behavior).
// Generates system messages so the change appears inline in the chat.
export async function PATCH(
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

    // Get the existing conversation so we can compare and only act on
    // actually-changed fields (and only emit system messages for changes).
    const { data: existing } = await supabase
      .from('user_conversations')
      .select('id, is_group, name, avatar_url')
      .eq('id', conversationId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    if (!existing.is_group) {
      return NextResponse.json({
        error: 'Only group conversations can be renamed or have an avatar'
      }, { status: 400 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    // Name: trim, cap to 120 chars. Empty string → null (cleared).
    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const raw = typeof body.name === 'string' ? body.name.trim() : null
      updates.name = raw && raw.length > 0 ? raw.slice(0, 120) : null
    }

    if (Object.prototype.hasOwnProperty.call(body, 'avatarUrl')) {
      updates.avatar_url = typeof body.avatarUrl === 'string' && body.avatarUrl.length > 0
        ? body.avatarUrl
        : null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('user_conversations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', conversationId)

    if (updateError) {
      console.error('[Messages API] Error updating conversation:', updateError)
      return NextResponse.json({
        error: 'Failed to update conversation',
        detail: updateError.message,
      }, { status: 500 })
    }

    // Get actor's name for the system message metadata (so the client can
    // render "Alice renamed the group" without needing a separate user lookup).
    const { data: actor } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', user.id)
      .single()

    // Emit system messages — one per actually-changed field.
    if ('name' in updates && updates.name !== existing.name) {
      await appendSystemMessage(conversationId, user.id, 'renamed', {
        actorId: user.id,
        actorName: actor?.name || null,
        oldName: existing.name,
        newName: updates.name,
      })
    }
    if ('avatar_url' in updates && updates.avatar_url !== existing.avatar_url) {
      await appendSystemMessage(conversationId, user.id, 'avatar_changed', {
        actorId: user.id,
        actorName: actor?.name || null,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Messages API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
