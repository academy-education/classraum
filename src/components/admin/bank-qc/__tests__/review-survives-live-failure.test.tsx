/**
 * @jest-environment jsdom
 *
 * The co-founder's review tool must not depend on the live bank read.
 * On 2026-10-27 /api/admin/bank-qc/live 500'd (17 parallel full-row pages
 * timing out) and the Review tab showed nothing while a run waited for him.
 */
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { LiveBankState } from '../LiveBankState'

jest.mock('@/lib/supabase', () => ({
  db: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}))
jest.mock('@/app/mobile/study/session/[id]/test/QuestionGraphicView', () => ({ QuestionGraphicView: () => null }))

beforeEach(() => {
  global.fetch = jest.fn(async (url: string) => {
    if (url.startsWith('/api/admin/bank-qc/live')) return { ok: false, status: 500, json: async () => ({}) } as Response
    const body = url.includes('next=1')
      ? { itemId: 'i1', options: ['alpha', 'beta', 'gamma', 'delta'] }
      : { runs: [], agreement: [], openRun: 'actreadingv8a-bridge1-cofounder-2026-10-27' }
    return { ok: true, json: async () => body } as Response
  }) as unknown as typeof fetch
})

it('shows the open review run on the Review tab when the live read fails', async () => {
  render(<LiveBankState tab="review" />)
  await act(async () => { await new Promise(r => setTimeout(r, 0)) })
  await act(async () => { await new Promise(r => setTimeout(r, 0)) })
  expect(screen.getByText('alpha')).toBeTruthy()
})
