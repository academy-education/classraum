/**
 * Client-side filter + rank for the admin study user directory.
 *
 * The directory route returns EVERY study user (paged reads past the
 * PostgREST cap); the search bar then works purely in memory:
 *   • empty query  → most recently active first
 *   • typed query  → case-insensitive substring match on email / name /
 *     nickname, ranked prefix-match first, then substring, ties broken by
 *     recency.
 */

export interface DirectoryUser {
  id: string
  name: string | null
  email: string | null
  role: string
  nickname: string | null
  isTestUser: boolean
  /** ISO timestamp of last study activity (or best available proxy). */
  lastActiveAt: string | null
}

function recency(u: DirectoryUser): number {
  const t = u.lastActiveAt ? Date.parse(u.lastActiveAt) : NaN
  return Number.isNaN(t) ? 0 : t
}

/** 0 = prefix match, 1 = substring match, Infinity = no match. */
function matchRank(u: DirectoryUser, q: string): number {
  const fields = [u.email, u.name, u.nickname]
  let best = Infinity
  for (const f of fields) {
    if (!f) continue
    const idx = f.toLowerCase().indexOf(q)
    if (idx === 0) return 0
    if (idx > 0) best = Math.min(best, 1)
  }
  return best
}

export function filterSortStudyUsers(users: readonly DirectoryUser[], query: string): DirectoryUser[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return [...users].sort((a, b) => recency(b) - recency(a))
  }
  return users
    .map(u => ({ u, rank: matchRank(u, q) }))
    .filter(x => x.rank !== Infinity)
    .sort((a, b) => (a.rank - b.rank) || (recency(b.u) - recency(a.u)))
    .map(x => x.u)
}
