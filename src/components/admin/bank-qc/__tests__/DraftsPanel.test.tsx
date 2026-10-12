/** @jest-environment jsdom */
/**
 * The Drafts tab across draft families (SSAT reading 5 choices, MAP reading 4):
 *  - the list labels each passage with its test and can filter by it
 *  - a MAP passage opens with exactly 4 choice boxes and saves with 4
 *  - an SSAT passage still opens with 5
 */
import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DraftsPanel } from '../DraftsPanel'

jest.mock('@/lib/supabase', () => ({
  db: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}))

const SUMMARY = (group: string, family: 'ssat-reading' | 'map-reading', title: string) => ({
  group, family, familyLabel: family === 'map-reading' ? 'MAP reading' : 'SSAT reading',
  cohort: family === 'map-reading' ? 'map-reading-draft-1' : 'ssat-reading-draft-1',
  items: family === 'map-reading' ? 4 : 6, status: 'awaiting_edit', title, highRisk: 0, editedAt: null,
})
const LIST = {
  passages: [SUMMARY('draft1-D1-P01', 'ssat-reading', 'The Scorebook'), SUMMARY('map-draft1-M1-P01', 'map-reading', 'The Kite Shop')],
  counts: { awaiting_edit: 2, edited: 0, skipped: 0 }, rows: 10,
}
const item = (i: number, choices: string[]) => ({
  id: `id-${i}`, sha: `sha-${i}`, status: 'awaiting_edit', prompt: `Question text ${i}`, choices, correctAnswer: choices[1],
  explanation: 'because', subskill: 'theme', qc: null, hasOriginal: false, editedAt: null, editNote: null,
})
const MAP_PASSAGE = {
  group: 'map-draft1-M1-P01', family: 'map-reading', familyLabel: 'MAP reading', choiceCount: 4,
  cohort: 'map-reading-draft-1', passage: 'The kite shop opened.',
  items: [0, 1, 2, 3].map(i => item(i, [`w${i}a`, `w${i}bb`, `w${i}c`, `w${i}d`])),
}
const SSAT_PASSAGE = {
  group: 'draft1-D1-P01', family: 'ssat-reading', familyLabel: 'SSAT reading', choiceCount: 5,
  cohort: 'ssat-reading-draft-1', passage: 'The scorebook.',
  items: [0, 1, 2, 3, 4, 5].map(i => item(i, [`s${i}a`, `s${i}bb`, `s${i}c`, `s${i}d`, `s${i}e`])),
}

let posted: Array<Record<string, unknown>> = []
beforeEach(() => {
  posted = []
  window.localStorage.clear()
  window.history.replaceState(null, '', '/admin/bank-qc?tab=drafts')
  global.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
    if (init?.method === 'POST') {
      posted.push(JSON.parse(String(init.body)))
      return { ok: true, status: 200, json: async () => ({ ok: true, written: 4, changed: 1 }) } as unknown as Response
    }
    const u = String(url)
    const body = u.includes('group=map-') ? MAP_PASSAGE : u.includes('group=draft1-') ? SSAT_PASSAGE : LIST
    return { ok: true, status: 200, json: async () => body } as unknown as Response
  }) as unknown as typeof fetch
  window.scrollTo = jest.fn() as unknown as typeof window.scrollTo
})

it('labels each passage with its test and filters by test', async () => {
  const u = userEvent.setup()
  render(<DraftsPanel />)
  expect(await screen.findByText('The Kite Shop')).toBeInTheDocument()
  const chips = screen.getAllByTestId('family-chip').map(c => c.textContent)
  expect(chips).toEqual(['SSAT reading', 'MAP reading'])
  await u.selectOptions(screen.getByLabelText('Filter by test'), 'map-reading')
  expect(screen.queryByText('The Scorebook')).not.toBeInTheDocument()
  expect(screen.getByText('The Kite Shop')).toBeInTheDocument()
})

it('opens a MAP passage with 4 choices per question and saves 4', async () => {
  const u = userEvent.setup()
  render(<DraftsPanel />)
  await u.click(await screen.findByText('The Kite Shop'))
  const cards = await screen.findAllByTestId('draft-item')
  expect(cards).toHaveLength(4)
  expect(screen.getByTestId('map-guidance')).toBeInTheDocument()
  for (const c of cards) {
    expect(within(c).getAllByRole('radio')).toHaveLength(4)
    expect(within(c).queryByLabelText('Choice E')).not.toBeInTheDocument()
  }
  // no blocking error at 4 choices: save is enabled
  const choiceA = within(cards[0]).getByLabelText('Choice A')
  await u.clear(choiceA); await u.type(choiceA, 'a new first choice')
  const save = screen.getByRole('button', { name: /Save passage/ })
  expect(save).toBeEnabled()
  await u.click(save)
  await waitFor(() => expect(posted).toHaveLength(1))
  const items = posted[0].items as { choices: string[] }[]
  expect(items).toHaveLength(4)
  expect(items.every(i => i.choices.length === 4)).toBe(true)
  expect(items[0].choices[0]).toBe('a new first choice')
})

it('still opens an SSAT passage with 5 choices per question', async () => {
  const u = userEvent.setup()
  render(<DraftsPanel />)
  await u.click(await screen.findByText('The Scorebook'))
  const cards = await screen.findAllByTestId('draft-item')
  expect(cards).toHaveLength(6)
  for (const c of cards) expect(within(c).getAllByRole('radio')).toHaveLength(5)
  expect(screen.queryByTestId('map-guidance')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Save passage/ })).toBeEnabled()
})
