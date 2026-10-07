/** @jest-environment jsdom */
/**
 * The hardening panel. What must hold for a reviewer:
 *  - the item, its grader votes and the subskill hint are on screen;
 *  - a save posts the EDIT plus the sha the reviewer looked at, and the
 *    panel then says the original is still what students see;
 *  - a non-super-admin gets a plain refusal, not an empty editor.
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HardeningPanel } from '../HardeningPanel'

jest.mock('@/lib/supabase', () => ({
  db: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}))

const ITEM = {
  id: 'item-1', family: 'sat', section: 'math', domain: 'Algebra', subskill: 'systems', difficulty: 'medium',
  cohort: 'v3', sha: 'sha-1', passageShared: false, passage: null,
  prompt: 'How many solutions does the system have?', choices: ['0', '1', '2', 'infinitely many'],
  correctAnswer: '1', explanation: 'The slopes differ.', hasGraphic: false,
  votes: [{ source: 'm18alg.grader-a.json', grader: 'grader-a', difficulty: 'hard', note: 'the k trap is real' },
    { source: 'm18alg.grader-b.json', grader: 'grader-b', difficulty: 'medium', note: 'medium rather than hard: the stem names the step' }],
  hardVotes: 1, totalVotes: 2, signals: ['hard_votes:1'],
  hint: { en: 'solution-count with a trap candidate', ko: '함정 후보', source: 'REGISTER' },
  queuedEdit: null, lastFailed: null,
}
const COUNTS = { candidates: 97, open: 97, staleVotes: 0, queued: 0, inGate: 0, passed: 0, swapped: 0, failed: 0 }

let posted: Array<Record<string, unknown>> = []
function mockFetch(getStatus = 200, getBody: unknown = { counts: COUNTS, index: 0, item: ITEM }) {
  posted = []
  global.fetch = jest.fn(async (_url: unknown, init?: RequestInit) => {
    if (init?.method === 'POST') {
      posted.push(JSON.parse(String(init.body)))
      return { ok: true, status: 200, json: async () => ({ editId: 'e1', status: 'queued', changed: ['prompt'], live: false }) } as unknown as Response
    }
    return { ok: getStatus < 400, status: getStatus, json: async () => getBody } as unknown as Response
  }) as unknown as typeof fetch
}

it('shows the item, the votes with their notes, and the hint', async () => {
  mockFetch()
  render(<HardeningPanel />)
  expect(await screen.findByDisplayValue(ITEM.prompt)).toBeInTheDocument()
  expect(screen.getByText(/the k trap is real/)).toBeInTheDocument()
  expect(screen.getByText(/the stem names the step/)).toBeInTheDocument()
  expect(screen.getByText(/solution-count with a trap candidate/)).toBeInTheDocument()
  expect(screen.getByText(/1 of 2 called it hard/)).toBeInTheDocument()
  // the key radio is on the live key
  expect(screen.getByLabelText('Mark option B as the key')).toBeChecked()
})

it('saves the edit with the sha it was opened at, and says students still see the original', async () => {
  mockFetch()
  const u = userEvent.setup()
  render(<HardeningPanel />)
  const stem = await screen.findByDisplayValue(ITEM.prompt)
  await u.clear(stem)
  await u.type(stem, 'For which k does the system have no solution?')
  await u.click(screen.getByRole('button', { name: /send to the gate/i }))
  await waitFor(() => expect(posted).toHaveLength(1))
  expect(posted[0]).toMatchObject({ itemId: 'item-1', expectedSha: 'sha-1', prompt: 'For which k does the system have no solution?', correctIndex: 1 })
  expect(await screen.findByRole('status')).toHaveTextContent(/Students still see the original/)
})

it('a non-super-admin sees a refusal, not an editor', async () => {
  mockFetch(403, { error: 'Hardening edits are limited to super admins.' })
  render(<HardeningPanel />)
  expect(await screen.findByText(/limited to super admins/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /send to the gate/i })).toBeNull()
})
