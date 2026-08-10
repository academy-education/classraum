/**
 * @jest-environment jsdom
 *
 * Pull-to-refresh on the topic page.
 *
 * The topic page has no single loader: prefs+subscription+topic, bank
 * counts, per-topic progress and pass credits each arrived in their own
 * effect. They are now four `useCallback`s that RETURN PROMISES, and
 * `refreshAll` awaits all four.
 *
 * The property worth pinning is the third test: `onRefresh` must not
 * resolve until the underlying loads settle. The shared
 * <PullToRefresh> awaits it and holds the spinner for exactly as long as
 * the returned promise is pending, so a fire-and-forget `refreshAll`
 * would render a spinner that flashes and lies about the data being
 * fresh — with no visible error anywhere.
 *
 * Every async source here (fetch + every supabase query) waits on a
 * single releasable `gate`, so the test controls precisely when the
 * loads settle.
 */
import React, { Suspense } from 'react'
import { render, act, waitFor } from '@testing-library/react'
import TopicPage from '../page'

// ── The one thing under test: what the page hands StudyScrollShell. ──
jest.mock('@/app/mobile/study/_shared/primitives', () => {
  // The shell renders nothing — the page's children are irrelevant here,
  // the props it is handed are the whole subject of this file.
  const store: { props?: { onRefresh?: () => void | Promise<void> } } = {}
  return {
    __store: store,
    StudyPageHeader: () => null,
    StudyTodayCard: () => null,
    StudyScrollShell: (props: { onRefresh?: () => void | Promise<void> }) => {
      store.props = props
      return null
    },
  }
})

jest.mock('@/app/mobile/study/SubscriptionGate', () => ({
  StudySubscriptionGate: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, language: 'english' }),
}))

jest.mock('@/contexts/PersistentMobileAuth', () => ({
  usePersistentMobileAuth: () => ({ user: { userId: 'student-1' } }),
}))

jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

/* ── The gate every async source waits on ───────────────────────────── */
type Gate = { promise: Promise<void>; release: () => void }
function makeGate(): Gate {
  let release!: () => void
  const promise = new Promise<void>(r => { release = r })
  return { promise, release }
}
let gate: Gate = makeGate()

/** Counts per data source, so "the loads ran again" is measurable. */
const calls: Record<string, number> = {}
const bump = (k: string) => { calls[k] = (calls[k] ?? 0) + 1 }

const TOPIC_ROW = {
  id: 'topic-1',
  parent_id: null,
  slug: 'sat-math',
  name_en: 'SAT Math',
  name_ko: 'SAT 수학',
  level: 2,
  category: 'test_prep',
}

// Chainable supabase stub. Every terminal await waits on the gate that
// was current when the query was issued, then answers per table.
jest.mock('@/lib/supabase', () => ({
  db: {
    from: (table: string) => {
      bump(`db:${table}`)
      const g = gate
      const result = async () => {
        await g.promise
        if (table === 'study_topics') return { data: TOPIC_ROW, count: null }
        if (table === 'study_mastery') return { data: null, count: null }
        if (table === 'study_sessions') return { data: [], count: 0 }
        return { data: [], count: null }
      }
      const chain: Record<string, unknown> = {}
      const self = () => chain
      Object.assign(chain, {
        select: self, eq: self, in: self, not: self, order: self, limit: self,
        maybeSingle: result,
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => result().then(res, rej),
      })
      return chain
    },
  },
}))

beforeEach(() => {
  gate = makeGate()
  for (const k of Object.keys(calls)) delete calls[k]
  global.fetch = jest.fn(async (url: RequestInfo | URL) => {
    const u = String(url)
    bump(`fetch:${u.split('?')[0]}`)
    const g = gate
    await g.promise
    const body = u.includes('/prefs')
      ? { prefs: { target_test: 'sat', target_tests: ['sat'] } }
      : u.includes('/subscription')
        ? { credits: { total: 5, grant: 5, purchased: 0 }, access: { all: true, tests: [] } }
        : { practice: 10, flashcards: 20 }
    return { ok: true, json: async () => body } as unknown as Response
  }) as unknown as typeof fetch
})

/** Mounts the page and lets the first load settle. */
async function mountLoaded() {
  // `use(params)` suspends, so the initial render must itself be awaited
  // inside act — otherwise the tree never gets past the Suspense boundary.
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <TopicPage params={Promise.resolve({ slug: 'sat-math' })} />
      </Suspense>,
    )
    await new Promise(r => setTimeout(r, 0))
  })
  await act(async () => { gate.release(); await new Promise(r => setTimeout(r, 0)) })
  const store = (jest.requireMock('@/app/mobile/study/_shared/primitives') as {
    __store: { props?: { onRefresh?: () => void | Promise<void> } }
  }).__store
  await waitFor(() => expect(store.props?.onRefresh).toBeInstanceOf(Function))
  return store.props!.onRefresh as () => Promise<void>
}

/** Snapshot of the four loads' call counts. */
const loadCounts = () => ({
  prefs: calls['fetch:/api/study/prefs'] ?? 0,
  bank: calls['fetch:/api/study/bank-counts'] ?? 0,
  topics: calls['db:study_topics'] ?? 0,
  progress: calls['db:study_mastery'] ?? 0,
  passes: calls['db:study_pass_credits'] ?? 0,
})

describe('topic page pull-to-refresh', () => {
  it('hands StudyScrollShell an onRefresh function', async () => {
    const onRefresh = await mountLoaded()
    expect(typeof onRefresh).toBe('function')
  })

  it('re-invokes all four data loads when onRefresh is called', async () => {
    const onRefresh = await mountLoaded()
    const before = loadCounts()
    // Every load ran once on mount — otherwise "ran again" proves nothing.
    expect(before).toEqual({ prefs: 1, bank: 1, topics: 1, progress: 1, passes: 1 })

    gate = makeGate()
    await act(async () => {
      const p = onRefresh()
      gate.release()
      await p
    })

    const after = loadCounts()
    expect(after.prefs).toBe(before.prefs + 1)
    expect(after.bank).toBe(before.bank + 1)
    expect(after.topics).toBe(before.topics + 1)
    expect(after.progress).toBe(before.progress + 1)
    expect(after.passes).toBe(before.passes + 1)
  })

  it('does NOT resolve until the underlying loads settle (honest spinner)', async () => {
    const onRefresh = await mountLoaded()

    gate = makeGate()
    let settled = false
    let refreshed!: Promise<void>
    await act(async () => {
      refreshed = Promise.resolve(onRefresh()).then(() => { settled = true })
      // Drain the microtask queue and a macrotask: everything that COULD
      // resolve without the gate has had every chance to.
      await new Promise(r => setTimeout(r, 0))
    })
    expect(settled).toBe(false)

    await act(async () => { gate.release(); await refreshed })
    expect(settled).toBe(true)
  })
})
