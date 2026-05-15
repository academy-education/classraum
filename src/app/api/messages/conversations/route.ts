import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ---- Helpers ----

/**
 * Returns the academy id for a user, regardless of role.
 * Returns null if no academy is associated.
 */
async function getAcademyIdForUser(userId: string): Promise<string | null> {
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (!userData) return null

  const tableByRole: Record<string, string> = {
    manager: 'managers',
    teacher: 'teachers',
    student: 'students',
    parent: 'parents',
  }
  const table = tableByRole[userData.role]
  if (!table) return null

  const { data } = await supabase
    .from(table)
    .select('academy_id')
    .eq('user_id', userId)
    .single()

  return data?.academy_id || null
}

/**
 * Find an existing 1:1 conversation between two users in an academy.
 * Returns the conversation id or null.
 *
 * After migration 019, every conversation (including 1:1) has rows in
 * `conversation_participants`. A 1:1 conversation is identified by
 * `is_group = false` and exactly the two participant ids.
 */
async function findExistingDM(
  userA: string,
  userB: string,
  academyId: string
): Promise<string | null> {
  // Conversations where userA is a participant
  const { data: aConvos } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userA)

  if (!aConvos || aConvos.length === 0) return null

  const aConvoIds = aConvos.map(c => c.conversation_id)

  // Of those, which also have userB AND are 1:1 in the same academy?
  const { data: shared } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_conversations!inner(id, academy_id, is_group)')
    .eq('user_id', userB)
    .in('conversation_id', aConvoIds)

  if (!shared) return null

  for (const row of shared) {
    const conv = row.user_conversations as unknown as {
      id: string
      academy_id: string
      is_group: boolean
    }
    if (!conv.is_group && conv.academy_id === academyId) {
      return conv.id
    }
  }
  return null
}

// ---- GET /api/messages/conversations ----

// List all conversations for the current user. Each conversation includes the
// full participant list so the UI can render group avatars / member counts.
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 1. Find every conversation this user is a member of.
    const { data: memberships } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const conversationIds = memberships.map(m => m.conversation_id)

    // 2. Fetch the conversation rows themselves (metadata).
    const { data: conversations, error } = await supabase
      .from('user_conversations')
      .select('id, academy_id, is_group, name, avatar_url, created_by, created_at, updated_at')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[Messages API] Error fetching conversations:', error)
      return NextResponse.json({
        error: 'Failed to fetch conversations',
        detail: error.message,
        code: error.code,
      }, { status: 500 })
    }

    // 3. Pull all participant rows. Avoid PostgREST's nested-embed syntax
    // (users(...)) — if the FK isn't visible to PostgREST's schema cache the
    // embed errors out. Two simple queries + an in-memory merge is safer.
    const { data: participantRows, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', conversationIds)

    if (partError) {
      console.error('[Messages API] Error fetching participants:', partError)
      return NextResponse.json({
        error: 'Failed to fetch participants',
        detail: partError.message,
        code: partError.code,
      }, { status: 500 })
    }

    const allUserIds = Array.from(new Set((participantRows || []).map(r => r.user_id)))
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .in('id', allUserIds)

    if (usersError) {
      console.error('[Messages API] Error fetching users:', usersError)
      return NextResponse.json({
        error: 'Failed to fetch users',
        detail: usersError.message,
        code: usersError.code,
      }, { status: 500 })
    }

    const usersById = new Map(
      (usersData || []).map(u => [u.id, { id: u.id, name: u.name, email: u.email, role: u.role }])
    )
    const participantsByConv = new Map<string, Array<{ id: string; name: string; email: string; role: string }>>()
    for (const row of participantRows || []) {
      const u = usersById.get(row.user_id)
      if (!u) continue
      const list = participantsByConv.get(row.conversation_id) || []
      list.push(u)
      participantsByConv.set(row.conversation_id, list)
    }

    // 4. Enrich each conversation with last message + unread count.
    const enrichedConversations = await Promise.all(
      (conversations || []).map(async (conv) => {
        const participants = participantsByConv.get(conv.id) || []
        const otherParticipants = participants.filter(p => p.id !== user.id)

        // Last message
        const { data: lastMessage } = await supabase
          .from('user_messages')
          .select('id, message, sender_id, created_at, is_read')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Unread count: messages from anyone other than the current user
        // that are not yet marked as read.
        const { count: unreadCount } = await supabase
          .from('user_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id)
          .eq('is_read', false)

        // For 1:1 chats, expose `participant` (legacy single-user shape) so
        // existing UI keeps working without forcing every consumer to switch
        // to `participants[]` immediately.
        const legacyParticipant = !conv.is_group && otherParticipants.length === 1
          ? otherParticipants[0]
          : null

        return {
          id: conv.id,
          isGroup: conv.is_group,
          name: conv.name,
          avatarUrl: conv.avatar_url || null,
          createdBy: conv.created_by,
          participants: otherParticipants,           // everyone except the current user
          allParticipants: participants,             // including the current user (for member list)
          participant: legacyParticipant,            // legacy single-user shape (1:1 only)
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

// ---- POST /api/messages/conversations ----

// Create a new conversation.
//
// Request body:
//   { participantIds: string[], name?: string }
//
//   - If participantIds.length === 1, creates (or returns existing) 1:1 DM.
//     `name` is ignored.
//   - If participantIds.length >= 2, creates a group conversation.
//     `name` is optional; if absent the UI will display a fallback (e.g.
//     comma-separated participant names).
//
// Backwards-compat: also accepts the legacy `{ participantId: string }`
// single-id shape so old client code keeps working during the transition.
export async function POST(request: NextRequest) {
  try {
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
    const rawParticipantIds: string[] = Array.isArray(body.participantIds)
      ? body.participantIds
      : body.participantId
        ? [body.participantId]
        : []

    // De-dupe and remove the current user if accidentally included.
    const participantIds = Array.from(new Set(rawParticipantIds.filter(
      (id: string) => typeof id === 'string' && id.length > 0 && id !== user.id
    )))

    if (participantIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one other participant is required' },
        { status: 400 }
      )
    }

    const academyId = await getAcademyIdForUser(user.id)
    if (!academyId) {
      return NextResponse.json(
        { error: 'User is not associated with an academy' },
        { status: 400 }
      )
    }

    const isGroup = participantIds.length >= 2
    const name = typeof body.name === 'string' && body.name.trim().length > 0
      ? body.name.trim().slice(0, 120)
      : null

    // For 1:1 chats, return the existing conversation if there is one.
    if (!isGroup) {
      const existingId = await findExistingDM(user.id, participantIds[0], academyId)
      if (existingId) {
        return NextResponse.json({
          conversation: { id: existingId },
          existing: true
        })
      }
    }

    // Create the conversation row.
    const insertPayload: Record<string, unknown> = {
      academy_id: academyId,
      is_group: isGroup,
      name,
      created_by: user.id,
    }
    // Keep the legacy participant_1/participant_2 columns populated for 1:1
    // chats so older read paths keep working until they're fully migrated.
    if (!isGroup) {
      insertPayload.participant_1_id = user.id
      insertPayload.participant_2_id = participantIds[0]
    }

    const { data: newConv, error: createError } = await supabase
      .from('user_conversations')
      .insert(insertPayload)
      .select()
      .single()

    if (createError || !newConv) {
      console.error('[Messages API] Error creating conversation:', createError)
      // Surface the underlying Postgres error message + code so the UI / logs
      // can tell apart NOT NULL violations from RLS failures vs missing
      // columns. Safe to expose because this endpoint is auth-gated.
      return NextResponse.json({
        error: 'Failed to create conversation',
        detail: createError?.message,
        code: createError?.code,
      }, { status: 500 })
    }

    // Insert membership rows for every participant including the creator.
    const membershipRows = [user.id, ...participantIds].map(id => ({
      conversation_id: newConv.id,
      user_id: id,
    }))
    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(membershipRows)

    if (partError) {
      console.error('[Messages API] Error inserting participants:', partError)
      // Roll back: delete the conversation we just created.
      await supabase.from('user_conversations').delete().eq('id', newConv.id)
      return NextResponse.json({
        error: 'Failed to add participants',
        detail: partError.message,
        code: partError.code,
      }, { status: 500 })
    }

    return NextResponse.json({
      conversation: {
        id: newConv.id,
        isGroup,
        name,
      },
      existing: false
    }, { status: 201 })
  } catch (error) {
    console.error('[Messages API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
