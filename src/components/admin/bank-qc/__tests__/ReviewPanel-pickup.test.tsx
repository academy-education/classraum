/**
 * @jest-environment jsdom
 *
 * A run drawn while the reviewer's page is already open must appear without a
 * manual reload. Twice on 2026-10-27 the co-founder reported "no questions"
 * while a run was waiting for him: the panel looked for it only on mount.
 */
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { ReviewPanel } from '../ReviewPanel'

jest.mock('@/lib/supabase', () => ({
  db: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}))
jest.mock('@/app/mobile/study/session/[id]/test/QuestionGraphicView', () => ({ QuestionGraphicView: () => null }))

let openRun: string | null = null
const calls: string[] = []

beforeEach(() => {
  openRun = null
  calls.length = 0
  global.fetch = jest.fn(async (url: string) => {
    calls.push(url)
    const body = url.includes('next=1')
      ? { itemId: 'i1', options: ['alpha', 'beta', 'gamma', 'delta'] }
      : { runs: [], agreement: [], openRun }
    return { ok: true, json: async () => body } as Response
  }) as unknown as typeof fetch
})

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

it('shows a run drawn after the page opened, when the page regains focus', async () => {
  render(<ReviewPanel domains={['Key Ideas and Details']} />)
  await flush()
  expect(screen.queryByText('alpha')).toBeNull()

  openRun = 'actreadingv8a-bridge1-cofounder-2026-10-27'
  await act(async () => { window.dispatchEvent(new Event('focus')) })
  await flush()

  expect(screen.getByText('alpha')).toBeTruthy()
  expect(calls.some(u => u.includes(encodeURIComponent(openRun!)) && u.includes('next=1'))).toBe(true)
})

it('does not refetch under the reviewer while a run is in progress', async () => {
  openRun = 'run-a'
  render(<ReviewPanel domains={['Key Ideas and Details']} />)
  await flush()
  expect(screen.getByText('alpha')).toBeTruthy()
  const before = calls.length

  await act(async () => { window.dispatchEvent(new Event('focus')) })
  await flush()
  expect(calls.length).toBe(before)
})
