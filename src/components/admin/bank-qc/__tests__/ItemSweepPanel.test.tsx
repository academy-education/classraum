/** @jest-environment jsdom */
/**
 * The sweep panel's rendering rules.
 *
 * The one that matters most is the key marker. "416 items rendered" is a
 * number that stays green on a component that highlights option A every
 * time, so the test below corrupts a key to match no choice and asserts
 * NOTHING is marked on that item — a check that can fail.
 *
 * The second is the progress denominator. `reviewed / total` must count
 * the whole bank, not the filtered view; a filtered denominator reads as
 * "everything checked" the moment someone narrows to one section.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemSweepPanel } from '../ItemSweepPanel'

jest.mock('@/lib/supabase', () => ({
  db: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}))

// `id` is applied AFTER the spread on purpose: an earlier version put it
// first and every override silently replaced 'id-1' with '1', which made two
// tests fail against a component that was correct.
const item = (over: Partial<Record<string, unknown>> = {}) => ({
  family: 'ssat', section: 'verbal',
  skill: 'synonyms', difficulty: 'medium', cohort: 'ssat-verbal-v1',
  passageGroupId: null, passage: null,
  prompt: 'PROMPT ' + (over.id ?? '1'),
  choices: ['alpha', 'bravo', 'charlie'],
  correctAnswer: 'bravo',
  explanation: 'bravo is right', distractorRationales: [],
  sha: 'sha' + (over.id ?? '1'),
  ...over,
  id: 'id-' + (over.id ?? '1'),
})

const payload = (items: unknown[], verdicts: unknown[] = []) => ({
  reviewerId: 'me', items, verdicts,
  totals: { items: items.length, reviewed: 0, keep: 0, flag: 0, reject: 0, stale: 0 },
  generatedAt: new Date().toISOString(),
})

let posted: unknown[] = []
function mockFetch(body: unknown) {
  posted = []
  global.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
    if (init?.method === 'POST') {
      posted.push(JSON.parse(String(init.body)))
      return { ok: true, json: async () => ({ ok: true }) } as unknown as Response
    }
    return { ok: true, json: async () => body } as unknown as Response
  }) as unknown as typeof fetch
}

const open = async () => {
  const u = userEvent.setup()
  await u.click(screen.getByRole('button', { name: /Read every question/i }))
  return u
}

it('marks exactly the correct answer, and marks nothing when the key matches no choice', async () => {
  mockFetch(payload([
    item({ id: '1' }),
    // A key that matches no option — the corruption the check must catch.
    item({ id: '2', correctAnswer: 'NOT-AN-OPTION' }),
  ]))
  render(<ItemSweepPanel />)
  await open()
  await waitFor(() => expect(screen.getByText('PROMPT 1')).toBeInTheDocument())

  const good = screen.getByText('PROMPT 1').closest('article')!
  const bad = screen.getByText('PROMPT 2').closest('article')!
  expect(within(good).getAllByText(/✓/).length).toBe(1)
  expect(within(good).getByText('bravo').closest('li')!.textContent).toContain('B ✓')
  expect(within(bad).queryAllByText(/✓/).length).toBe(0)
})

it('counts progress over the whole bank, not the filtered view', async () => {
  mockFetch(payload([
    item({ id: '1' }),
    item({ id: '2', family: 'isee' }),
    item({ id: '3', family: 'isee' }),
    item({ id: '4', family: 'isee' }),
  ]))
  render(<ItemSweepPanel />)
  const u = await open()
  await waitFor(() => expect(screen.getByText('PROMPT 1')).toBeInTheDocument())

  await u.selectOptions(screen.getByLabelText('Test'), 'ssat')
  expect(screen.getByText('1 shown')).toBeInTheDocument()
  // Denominator stays 4 even though one item is on screen.
  expect(screen.getByText('/ 4 reviewed')).toBeInTheDocument()
})

it('will not save a reject until a note is written, and says so on the row', async () => {
  mockFetch(payload([item({ id: '1' })]))
  render(<ItemSweepPanel />)
  const u = await open()
  await waitFor(() => expect(screen.getByText('PROMPT 1')).toBeInTheDocument())

  // Scoped to the row: the panel's own header copy also contains the word.
  const row = screen.getByText('PROMPT 1').closest('article')!
  await u.click(within(row).getByRole('button', { name: /Reject/i }))
  expect(screen.getByText(/Add a note/i)).toBeInTheDocument()
  expect(posted).toHaveLength(0)

  await u.type(screen.getByLabelText('Reviewer note'), 'two defensible answers')
  await waitFor(() => expect(posted).toHaveLength(1), { timeout: 2000 })
  expect(posted[0]).toMatchObject({ verdict: 'reject', note: 'two defensible answers' })
})

it('saves a keep immediately, with no note needed', async () => {
  mockFetch(payload([item({ id: '1' })]))
  render(<ItemSweepPanel />)
  const u = await open()
  await waitFor(() => expect(screen.getByText('PROMPT 1')).toBeInTheDocument())

  const row = screen.getByText('PROMPT 1').closest('article')!
  await u.click(within(row).getByRole('button', { name: /Keep/i }))
  await waitFor(() => expect(posted).toHaveLength(1))
  expect(posted[0]).toMatchObject({ itemId: 'id-1', verdict: 'keep' })
})

it('shows one passage above the questions that share it', async () => {
  mockFetch(payload([
    item({ id: '1', section: 'reading', passageGroupId: 'rw-A', passage: 'PASSAGE ONE' }),
    item({ id: '2', section: 'reading', passageGroupId: 'rw-A', passage: 'PASSAGE ONE' }),
    item({ id: '3', section: 'reading', passageGroupId: 'rw-B', passage: 'PASSAGE TWO' }),
  ]))
  render(<ItemSweepPanel />)
  await open()
  await waitFor(() => expect(screen.getByText('PROMPT 1')).toBeInTheDocument())
  expect(screen.getAllByText('PASSAGE ONE')).toHaveLength(1)
  expect(screen.getAllByText('PASSAGE TWO')).toHaveLength(1)
})

it('surfaces another reviewer disagreeing', async () => {
  mockFetch(payload(
    [item({ id: '1' })],
    [{ itemId: 'id-1', reviewerId: 'them', mine: false, verdict: 'reject', note: 'bad', stale: false, updatedAt: '' }],
  ))
  render(<ItemSweepPanel />)
  await open()
  await waitFor(() => expect(screen.getByText('PROMPT 1')).toBeInTheDocument())
  // JSX splits this across text nodes, so match on the element's full text.
  const row = screen.getByText('PROMPT 1').closest('article')!
  expect(row.textContent).toMatch(/Another reviewer marked this reject/i)
})

describe('a failed load does not retry forever', () => {
  /*
   * The bug a reviewer hit: the effect guard was
   *   open && !data && !loading
   * so a failure set the error, cleared loading, and the effect
   * immediately fetched again. The panel showed "Loading the bank…"
   * permanently and the error never stayed on screen long enough to read.
   *
   * THE BEHAVIOURAL VERSION OF THIS TEST DID NOT DISCRIMINATE. Counting
   * fetches after an induced failure passed with the loop restored,
   * because jsdom does not flush the effect cycle within any window I
   * could assert on. A test that cannot fail is worse than none, so the
   * guard is pinned at the source instead — verified to fail when `err`
   * is removed from the condition.
   */
  const src = readFileSync(
    join(process.cwd(), 'src/components/admin/bank-qc/ItemSweepPanel.tsx'), 'utf8')

  it('has err in the load guard', () => {
    expect(src).toMatch(/if \(open && !data && !loading && !err\) void load\(\)/)
    expect(src).toMatch(/\[open, data, loading, err, load\]/)
  })

  it('offers a manual retry, since it no longer retries itself', async () => {
    expect(src).toMatch(/Try again/)
    let calls = 0
    global.fetch = jest.fn(async (_u: unknown, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: true, json: async () => ({}) } as unknown as Response
      calls++
      if (calls === 1) return { ok: false, json: async () => ({ error: 'boom' }) } as unknown as Response
      return { ok: true, json: async () => payload([item({ id: '1' })]) } as unknown as Response
    }) as unknown as typeof fetch

    render(<ItemSweepPanel />)
    const u = await open()
    await waitFor(() => expect(screen.getByText(/boom/)).toBeInTheDocument())
    await u.click(screen.getByRole('button', { name: /Try again/i }))
    await waitFor(() => expect(screen.getByText('PROMPT 1')).toBeInTheDocument())
  })
})

describe('the sweep route does not filter verdicts by an id list', () => {
  /*
   * supabase-js sends a select as a GET, so `.in('item_id', ids)` over
   * the whole bank built a 28,452-character URL for 769 items. The
   * request never returned, which is what left the panel loading
   * forever. The verdicts table is small; it is read whole and joined
   * in memory.
   */
  const route = readFileSync(
    join(process.cwd(), 'src/app/api/admin/bank-qc/sweep/route.ts'), 'utf8')

  it('has no .in() over item ids', () => {
    expect(route).not.toMatch(/\.in\('item_id'/)
  })

  it('pages the verdicts read, so a 1000-row cap cannot truncate it', () => {
    expect(route).toMatch(/from \+ 999/)
  })
})
