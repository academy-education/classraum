/**
 * @jest-environment jsdom
 *
 * Which tab the QC page opens on, and that the choice is remembered.
 * Links in sitting briefs and docs say ?tab=review / drafts / hardening, so
 * the old names must still land somewhere sensible after the regrouping.
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { initialTab, tabFromSearch, normaliseTab, TAB_STORAGE_KEY, QC_TABS } from '../tabs'
import { BankQcDashboard } from '../BankQcDashboard'

jest.mock('@/lib/supabase', () => ({
  db: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}))

describe('tab resolution', () => {
  it('maps the pre-2026-10-23 tab names onto the new groups', () => {
    expect(tabFromSearch('?tab=hardening')).toBe('quality')
    expect(tabFromSearch('?tab=runs')).toBe('history')
    expect(tabFromSearch('?tab=reference')).toBe('history')
    expect(tabFromSearch('?tab=review')).toBe('review')
    expect(tabFromSearch('?tab=drafts')).toBe('drafts')
    expect(tabFromSearch('?tab=nonsense')).toBe('overview')
    expect(normaliseTab('all')).toBeNull()
  })
  it('URL beats hash beats the remembered tab', () => {
    expect(initialTab({ search: '?tab=live', hash: '#register' }, 'drafts')).toBe('live')
    expect(initialTab({ search: '', hash: '#register' }, 'drafts')).toBe('register')
    expect(initialTab({ search: '', hash: '' }, 'drafts')).toBe('drafts')
    expect(initialTab({ search: '', hash: '' }, 'garbage')).toBe('overview')
  })
})

describe('BankQcDashboard tabs', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '/admin/bank-qc')
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: 'offline' }) })) as unknown as typeof fetch
  })

  it('offers every tab both as buttons and as the phone select', () => {
    render(<BankQcDashboard />)
    const select = screen.getByRole('combobox', { name: 'Section' }) as HTMLSelectElement
    expect(Array.from(select.options).map(o => o.value)).toEqual(QC_TABS)
    expect(screen.getByRole('button', { name: 'Quality checks' })).toBeInTheDocument()
  })

  it('remembers the chosen tab in the URL and in localStorage', () => {
    render(<BankQcDashboard />)
    fireEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(window.location.search).toBe('?tab=register')
    expect(window.localStorage.getItem(TAB_STORAGE_KEY)).toBe('register')
    expect(screen.getByRole('button', { name: 'Register' })).toHaveAttribute('aria-current', 'page')

    fireEvent.change(screen.getByRole('combobox', { name: 'Section' }), { target: { value: 'history' } })
    expect(window.location.search).toBe('?tab=history')
    expect(window.localStorage.getItem(TAB_STORAGE_KEY)).toBe('history')
  })

  it('reopens on the remembered tab when the URL names none', () => {
    window.localStorage.setItem(TAB_STORAGE_KEY, 'live')
    render(<BankQcDashboard />)
    expect(screen.getByRole('button', { name: 'Live bank' })).toHaveAttribute('aria-current', 'page')
  })

  it('an old ?tab=hardening link opens Quality checks', () => {
    window.history.replaceState(null, '', '/admin/bank-qc?tab=hardening')
    render(<BankQcDashboard />)
    expect(screen.getByRole('button', { name: 'Quality checks' })).toHaveAttribute('aria-current', 'page')
  })
})
