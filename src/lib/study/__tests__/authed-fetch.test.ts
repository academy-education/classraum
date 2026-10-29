/** @jest-environment node */
import { authedFetch, __resetAuthedFetchForTests } from '@/lib/study/authed-fetch'
import { db } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  db: { auth: { getSession: jest.fn(), refreshSession: jest.fn() } },
}))

const getSession = db.auth.getSession as unknown as jest.Mock
const refreshSession = db.auth.refreshSession as unknown as jest.Mock
const fetchMock = jest.fn()

const session = (token: string | null) => ({ data: { session: token ? { access_token: token } : null } })
const res = (status: number, body = '{}') => new Response(body, { status })
const authOf = (call: unknown[]) => new Headers((call[1] as RequestInit).headers).get('Authorization')

beforeEach(() => {
  __resetAuthedFetchForTests()
  jest.resetAllMocks()
  global.fetch = fetchMock as unknown as typeof fetch
})

describe('authedFetch', () => {
  it('sends nothing when there is no session', async () => {
    getSession.mockResolvedValue(session(null))
    expect(await authedFetch('/api/study/progress')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a 401 triggers one refresh, then one retry with the new token', async () => {
    getSession.mockResolvedValue(session('old'))
    refreshSession.mockResolvedValue(session('new'))
    fetchMock.mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(200, '{"ok":1}'))

    const r = await authedFetch('/api/study/progress')
    expect(r?.status).toBe(200)
    expect(await r?.json()).toEqual({ ok: 1 })
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls.map(authOf)).toEqual(['Bearer old', 'Bearer new'])
  })

  it('gives up after one retry: a second 401 is returned, not retried again', async () => {
    getSession.mockResolvedValue(session('old'))
    refreshSession.mockResolvedValue(session('new'))
    fetchMock.mockResolvedValue(res(401))

    const r = await authedFetch('/api/study/progress')
    expect(r?.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('does not retry when the refresh yields no new token', async () => {
    getSession.mockResolvedValue(session('old'))
    refreshSession.mockResolvedValue(session(null))
    fetchMock.mockResolvedValue(res(401))

    expect((await authedFetch('/api/study/progress'))?.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('concurrent identical GETs share one request, and each caller can read the body', async () => {
    getSession.mockResolvedValue(session('t'))
    fetchMock.mockResolvedValue(res(200, '{"n":7}'))

    const all = await Promise.all(Array.from({ length: 7 }, () => authedFetch('/api/study/progress')))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    for (const r of all) expect(await r?.json()).toEqual({ n: 7 })
  })

  it('concurrent 401s on different URLs share one refresh', async () => {
    getSession.mockResolvedValue(session('old'))
    let resolveRefresh: (v: unknown) => void = () => {}
    refreshSession.mockReturnValue(new Promise(r => { resolveRefresh = r }))
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
      new Headers(init.headers).get('Authorization') === 'Bearer old' ? res(401) : res(200))

    const p = Promise.all([authedFetch('/api/study/progress'), authedFetch('/api/study/streak')])
    await new Promise(r => setTimeout(r, 0))
    resolveRefresh(session('new'))
    const [a, b] = await p
    expect(a?.status).toBe(200)
    expect(b?.status).toBe(200)
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('does not share POSTs', async () => {
    getSession.mockResolvedValue(session('t'))
    fetchMock.mockImplementation(async () => res(200))
    await Promise.all([
      authedFetch('/api/study/x', { method: 'POST', body: '{}' }),
      authedFetch('/api/study/x', { method: 'POST', body: '{}' }),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
