/**
 * @jest-environment jsdom
 *
 * The admin chrome, rendered as the app renders it (AdminLayout hands this
 * exact component its children after the auth check). The cases that matter:
 *
 *  - the drawer is closed on first render whatever the viewport, and the
 *    server render matches — the old shell started "open" on the server and
 *    on any >= 1024px client, which became an uninvited modal drawer the
 *    moment a tablet was turned upright;
 *  - it opens only from a tap (header menu or the bottom bar's More) and
 *    closes from X, backdrop, Escape, navigation and crossing into lg;
 *  - the bottom bar's tabs, active state and permission filtering.
 */
import React from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'

let mockPath = '/admin/users'
jest.mock('next/navigation', () => ({
  usePathname: () => mockPath,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// AdminSidebar polls two badge counts through the browser client.
jest.mock('@/lib/supabase', () => {
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'neq']) chain[m] = () => chain
  ;(chain as { then: unknown }).then = (res: (v: unknown) => void) => res({ count: 0, error: null })
  return { db: { from: () => chain, auth: { signOut: jest.fn() } } }
})
jest.mock('@/lib/logout', () => ({ performLogout: jest.fn() }))

// English strings straight from the locale file, so assertions read real copy.
jest.mock('@/hooks/useTranslation', () => {
  const en = jest.requireActual('@/locales/en.json')
  const t = (key: string) => key.split('.').reduce((n: unknown, k) => (n as Record<string, unknown> | undefined)?.[k], en) ?? key
  return { useTranslation: () => ({ t, tList: () => [], language: 'english', setLanguage: jest.fn() }) }
})

import { AdminShell } from '../AdminShell'
import { ADMIN_BOTTOM_TABS } from '../AdminBottomNav'
import type { AdminUser } from '@/lib/admin-auth-shared'

/** A controllable matchMedia for the one query the shell cares about. */
function installMatchMedia(initial: boolean) {
  let matches = initial
  const listeners = new Set<() => void>()
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    get matches() { return matches },
    media: query,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    addListener: jest.fn(), removeListener: jest.fn(), dispatchEvent: jest.fn(), onchange: null,
  })) as unknown as typeof window.matchMedia
  return {
    set(v: boolean) { matches = v; act(() => listeners.forEach(l => l())) },
  }
}

const admin = (role: 'admin' | 'super_admin' = 'super_admin'): AdminUser => ({
  id: 'u1', email: 'ops@example.test', name: 'Ops Person', role, createdAt: new Date('2025-01-01'),
})

const drawer = () => screen.queryByRole('dialog')
const menuButton = () => screen.getByTestId('admin-menu-button')
const bottomNav = () => screen.getByTestId('admin-bottom-nav')

function renderShell(role: 'admin' | 'super_admin' = 'super_admin') {
  return render(<AdminShell adminUser={admin(role)}><p>page body</p></AdminShell>)
}

beforeEach(() => { mockPath = '/admin/users' })

describe('AdminShell drawer', () => {
  it('server render has no drawer and does not depend on the window', () => {
    installMatchMedia(true)
    const html = renderToString(<AdminShell adminUser={admin()}><p>page body</p></AdminShell>)
    expect(html).not.toContain('role="dialog"')
    expect(html).toContain('data-testid="admin-rail"')
  })

  it('starts closed even when the first render is desktop-width', () => {
    installMatchMedia(true)
    renderShell()
    expect(drawer()).toBeNull()
    expect(screen.getByTestId('admin-rail')).toBeInTheDocument()
  })

  it('a landscape tablet turned upright does not get an uninvited drawer (the reported bug)', () => {
    const mq = installMatchMedia(true)
    renderShell()
    mq.set(false)
    expect(drawer()).toBeNull()
  })

  it('opens from the menu button and closes from the X', () => {
    installMatchMedia(false)
    renderShell()
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(menuButton())
    expect(drawer()).toBeInTheDocument()
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(within(drawer()!).getByRole('button', { name: 'Close sidebar' }))
    expect(drawer()).toBeNull()
  })

  it('closes from the backdrop', () => {
    installMatchMedia(false)
    renderShell()
    fireEvent.click(menuButton())
    fireEvent.click(screen.getByTestId('admin-drawer-backdrop'))
    expect(drawer()).toBeNull()
  })

  it('closes on Escape', () => {
    installMatchMedia(false)
    renderShell()
    fireEvent.click(menuButton())
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(drawer()).toBeNull()
  })

  it('closes on navigation', () => {
    installMatchMedia(false)
    const { rerender } = renderShell()
    fireEvent.click(menuButton())
    expect(drawer()).toBeInTheDocument()
    mockPath = '/admin/analytics'
    rerender(<AdminShell adminUser={admin()}><p>page body</p></AdminShell>)
    expect(drawer()).toBeNull()
  })

  it('is retired when the viewport grows into rail territory, and stays closed coming back', () => {
    const mq = installMatchMedia(false)
    renderShell()
    fireEvent.click(menuButton())
    mq.set(true)
    mq.set(false)
    expect(drawer()).toBeNull()
  })

  it('the desktop rail toggle is a separate control and never opens the drawer', () => {
    installMatchMedia(true)
    renderShell()
    fireEvent.click(screen.getByTestId('admin-rail-toggle'))
    expect(screen.queryByTestId('admin-rail')).toBeNull()
    expect(drawer()).toBeNull()
    fireEvent.click(screen.getByTestId('admin-rail-toggle'))
    expect(screen.getByTestId('admin-rail')).toBeInTheDocument()
  })
})

describe('AdminShell bottom bar', () => {
  it('shows Home, Bank QC, Users, Support and More, with the current page active', () => {
    installMatchMedia(false)
    renderShell()
    const nav = bottomNav()
    const labels = [...within(nav).getAllByRole('link'), ...within(nav).getAllByRole('button')].map(e => e.textContent)
    expect(labels).toEqual(['Home', 'Bank QC', 'Users', 'Support', 'More'])
    expect(within(nav).getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('Home is active only on /admin itself, not on every admin page', () => {
    installMatchMedia(false)
    mockPath = '/admin'
    renderShell()
    expect(within(bottomNav()).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  it('More opens the full drawer, and is the active tab on a page without its own tab', () => {
    installMatchMedia(false)
    mockPath = '/admin/webhook-events'
    renderShell()
    const more = within(bottomNav()).getByRole('button', { name: 'More' })
    expect(more.className).toMatch(/text-primary/)
    expect(within(bottomNav()).queryByRole('link', { current: 'page' })).toBeNull()
    fireEvent.click(more)
    expect(drawer()).toBeInTheDocument()
    expect(more).toHaveAttribute('aria-expanded', 'true')
  })

  it('never puts a super-admin-only destination on the bar, for either role', () => {
    const superOnly = ['/admin/activity-logs', '/admin/error-logs', '/admin/subscription-usage', '/admin/webhook-events', '/admin/system', '/admin/settings']
    expect(ADMIN_BOTTOM_TABS.map(t => t.href).filter(h => superOnly.includes(h))).toEqual([])
    installMatchMedia(false)
    renderShell('admin')
    const hrefs = within(bottomNav()).getAllByRole('link').map(a => a.getAttribute('href'))
    expect(hrefs).toEqual(['/admin', '/admin/bank-qc', '/admin/users', '/admin/support'])
  })

  it('a regular admin opening More sees no super-admin section in the drawer', () => {
    installMatchMedia(false)
    renderShell('admin')
    fireEvent.click(within(bottomNav()).getByRole('button', { name: 'More' }))
    expect(within(drawer()!).queryByRole('link', { name: /System|Error logs|Webhook events/ })).toBeNull()
  })

  it('the bar sits after <main> in the column, so it is in flow and cannot cover page content', () => {
    installMatchMedia(false)
    renderShell()
    const main = screen.getByRole('main')
    expect(main.nextElementSibling).toBe(bottomNav())
    expect(bottomNav().className).not.toMatch(/\bfixed\b|\babsolute\b/)
  })
})
