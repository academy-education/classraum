/**
 * @jest-environment node
 */
import fs from 'fs'
import path from 'path'
import { fetchUserContacts, fetchOwnContact, withContacts, USER_PUBLIC_COLUMNS } from '../contacts'

type RpcResult = { data: unknown; error: { code?: string; message: string } | null }
type SelResult = { data: unknown; error: { code?: string; message: string } | null }

function fakeClient(rpc: RpcResult, sel: SelResult = { data: [], error: null }) {
  const calls = { rpc: [] as unknown[], select: [] as unknown[] }
  const client = {
    rpc: jest.fn(async (name: string, args: unknown) => { calls.rpc.push([name, args]); return rpc }),
    from: jest.fn((table: string) => ({
      select: (cols: string) => ({
        in: async (col: string, ids: string[]) => { calls.select.push([table, cols, col, ids]); return sel },
      }),
    })),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, calls }
}

describe('fetchUserContacts', () => {
  it('reads contacts from app_user_contacts and never touches the users columns', async () => {
    const { client, calls } = fakeClient({ data: [{ id: 'a', email: 'a@x', phone: '010' }], error: null })
    const map = await fetchUserContacts(client, ['a', 'b'])
    expect(calls.rpc).toEqual([['app_user_contacts', { uids: ['a', 'b'] }]])
    expect(calls.select).toEqual([])
    expect(map.get('a')).toEqual({ email: 'a@x', phone: '010' })
    // an id the caller may not see is ABSENT, not an error
    expect(map.has('b')).toBe(false)
  })

  it('dedupes and drops null/empty ids; no call at all for an empty list', async () => {
    const { client, calls } = fakeClient({ data: [], error: null })
    await fetchUserContacts(client, ['a', null, 'a', undefined, '', 'b'])
    expect(calls.rpc).toEqual([['app_user_contacts', { uids: ['a', 'b'] }]])
    const empty = fakeClient({ data: [], error: null })
    expect((await fetchUserContacts(empty.client, [null, undefined])).size).toBe(0)
    expect(empty.calls.rpc).toEqual([])
  })

  it('falls back to the direct columns ONLY while the function does not exist (PGRST202)', async () => {
    const { client, calls } = fakeClient(
      { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } },
      { data: [{ id: 'a', email: 'a@x', phone: null }], error: null },
    )
    const map = await fetchUserContacts(client, ['a'])
    expect(calls.select).toEqual([['users', 'id, email, phone', 'id', ['a']]])
    expect(map.get('a')).toEqual({ email: 'a@x', phone: null })
  })

  it('surfaces any other error instead of quietly reading the columns', async () => {
    const { client, calls } = fakeClient({ data: null, error: { code: '42501', message: 'permission denied' } })
    await expect(fetchUserContacts(client, ['a'])).rejects.toMatchObject({ code: '42501' })
    expect(calls.select).toEqual([])
  })

  it('surfaces a failing fallback select (post-migration, function dropped)', async () => {
    const { client } = fakeClient(
      { data: null, error: { code: 'PGRST202', message: 'missing' } },
      { data: null, error: { code: '42501', message: 'permission denied for table users' } },
    )
    await expect(fetchUserContacts(client, ['a'])).rejects.toMatchObject({ code: '42501' })
  })

  it('fetchOwnContact returns nulls rather than throwing when the row is absent', async () => {
    const { client } = fakeClient({ data: [], error: null })
    expect(await fetchOwnContact(client, 'me')).toEqual({ email: null, phone: null })
  })
})

describe('withContacts', () => {
  it('merges by id and nulls rows the caller may not see', () => {
    const contacts = new Map([['a', { email: 'a@x', phone: '1' }]])
    expect(withContacts([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], r => r.id, contacts)).toEqual([
      { id: 'a', name: 'A', email: 'a@x', phone: '1' },
      { id: 'b', name: 'B', email: null, phone: null },
    ])
  })
})

describe('USER_PUBLIC_COLUMNS vs migration 120', () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'database/migrations/120_users_contact_columns.sql'), 'utf8')
  const grant = sql.match(/grant select \(([^)]*)\)\s*on public\.users to authenticated/i)

  it('is exactly the column list the migration grants back', () => {
    expect(grant).not.toBeNull()
    const granted = grant![1].split(',').map(s => s.trim()).filter(Boolean).sort()
    const ours = USER_PUBLIC_COLUMNS.split(',').map(s => s.trim()).sort()
    expect(ours).toEqual(granted)
  })

  it('withholds email and phone', () => {
    const cols = USER_PUBLIC_COLUMNS.split(',').map(s => s.trim())
    expect(cols).not.toContain('email')
    expect(cols).not.toContain('phone')
    expect(grant![1]).not.toMatch(/\b(email|phone)\b/)
  })

  it('revokes the table-wide SELECT before granting columns back (else the column grant is a no-op)', () => {
    const revokeAt = sql.search(/revoke select on public\.users from authenticated, anon;/i)
    const grantAt = sql.search(/grant select \(/i)
    expect(revokeAt).toBeGreaterThan(-1)
    expect(grantAt).toBeGreaterThan(revokeAt)
  })

  it('keeps app_user_contacts away from anon/PUBLIC (its NULL-uid branch is the service role)', () => {
    expect(sql).toMatch(/revoke all on function public\.app_user_contacts\(uuid\[\]\) from public, anon;/i)
    expect(sql).not.toMatch(/grant execute on function public\.app_user_contacts\(uuid\[\]\) to[^;]*\banon\b/i)
  })
})
