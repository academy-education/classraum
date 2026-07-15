import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Friendship-graph helpers shared across the friends + leaderboard routes.
 * A friendship is one row (directed by requester) but undirected once
 * accepted, so "my friends" reads both sides.
 */

export interface FriendshipRow {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
}

/** All accepted friends' user ids (the OTHER party on each accepted edge). */
export async function listAcceptedFriendIds(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('study_friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
  return (data ?? []).map(r =>
    r.requester_id === userId ? (r.addressee_id as string) : (r.requester_id as string),
  )
}

/** The existing friendship row between two users (either direction), or null. */
export async function findFriendship(a: string, b: string): Promise<FriendshipRow | null> {
  const { data } = await supabaseAdmin
    .from('study_friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`)
    .maybeSingle()
  return (data as FriendshipRow | null) ?? null
}

/**
 * Ensure an ACCEPTED friendship exists between two users (used when a
 * referral is redeemed — referrer and referee become friends automatically).
 * Idempotent + race-safe via the unordered-pair unique index: an existing
 * pending row is promoted to accepted; a duplicate insert is swallowed.
 * Never throws.
 */
export async function ensureAcceptedFriendship(a: string, b: string): Promise<void> {
  if (a === b) return
  try {
    const existing = await findFriendship(a, b)
    if (existing) {
      if (existing.status !== 'accepted') {
        await supabaseAdmin
          .from('study_friendships')
          .update({ status: 'accepted', responded_at: new Date().toISOString() })
          .eq('id', existing.id)
      }
      return
    }
    await supabaseAdmin
      .from('study_friendships')
      .insert({ requester_id: a, addressee_id: b, status: 'accepted', responded_at: new Date().toISOString() })
  } catch (err) {
    // Unique-pair collision under a race, or a transient error — the
    // friendship is best-effort here (auto-add on redeem), never fatal.
    console.error('[study/friends] ensureAcceptedFriendship failed', { a, b, error: err })
  }
}
