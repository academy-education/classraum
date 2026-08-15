import { filterSortStudyUsers, type DirectoryUser } from '../admin-user-search'

const u = (over: Partial<DirectoryUser> & { id: string }): DirectoryUser => ({
  name: null,
  email: null,
  role: 'student',
  nickname: null,
  isTestUser: false,
  lastActiveAt: null,
  ...over,
})

describe('filterSortStudyUsers', () => {
  const users = [
    u({ id: 'a', name: 'Andrew Park', email: 'andrew.park@example.com', lastActiveAt: '2026-08-01T00:00:00Z' }),
    u({ id: 'b', name: 'Bora Kim', email: 'bora@example.com', nickname: 'andromeda', lastActiveAt: '2026-08-10T00:00:00Z' }),
    u({ id: 'c', name: 'Chan Lee', email: 'chan@example.com', lastActiveAt: '2026-08-15T00:00:00Z' }),
    u({ id: 'd', name: 'Dan Andrews', email: 'dan@example.com', lastActiveAt: null }),
  ]

  it('empty query → most recently active first, never-active last', () => {
    expect(filterSortStudyUsers(users, '').map(x => x.id)).toEqual(['c', 'b', 'a', 'd'])
  })

  it('filters by case-insensitive substring across email, name and nickname', () => {
    const ids = filterSortStudyUsers(users, 'ANDR').map(x => x.id)
    expect(ids).toContain('a') // name/email prefix
    expect(ids).toContain('b') // nickname prefix
    expect(ids).toContain('d') // name substring (Andrews)
    expect(ids).not.toContain('c')
  })

  it('ranks prefix matches before substring matches, recency breaking ties', () => {
    // 'andr': prefix on a (Andrew…) and b (andromeda); substring on d (Dan Andrews)
    expect(filterSortStudyUsers(users, 'andr').map(x => x.id)).toEqual(['b', 'a', 'd'])
  })

  it('returns nothing on a non-matching query', () => {
    expect(filterSortStudyUsers(users, 'zzz')).toEqual([])
  })

  it('does not mutate the input order', () => {
    const before = users.map(x => x.id)
    filterSortStudyUsers(users, '')
    expect(users.map(x => x.id)).toEqual(before)
  })
})
