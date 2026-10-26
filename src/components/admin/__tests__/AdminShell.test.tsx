/**
 * @jest-environment jsdom
 *
 * The admin chrome, rendered as the app renders it (AdminLayout hands this
 * exact component its children after the auth check). The cases that matter:
 *
 *  - there is no drawer at any width: below lg the bottom bar and its shelves
 *    are the whole navigation, like the academy-mode bar;
 *  - every page the rail lists sits in exactly one bar group, filtered by the
 *    same permissions, so the bar can never hide a page the rail shows;
 *  - shelves open from a tap and close from X, outside, Escape and navigation;
 *  - the rail toggle at lg+ and the server render do not depend on the window.
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
import { ADMIN_BOTTOM_GROUPS, visibleAdminPages } from '../AdminBottomNav'
import { navigationItems, superAdminItems } from '../AdminSidebar'
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

const shelf = () => screen.queryByTestId('admin-shelf')
const bottomNav = () => screen.getByTestId('admin-bottom-nav')
const groupLabels = () => [...bottomNav().querySelectorAll('a, button')].map(e => e.textContent)

function renderShell(role: 'admin' | 'super_admin' = 'super_admin') {
  return render(<AdminShell adminUser={admin(role)}><p>page body</p></AdminShell>)
}

beforeEach(() => { mockPath = '/admin/users' })

describe('AdminShell without a drawer', () => {
  it('server render has the rail and no drawer or shelf', () => {
    installMatchMedia(true)
    const html = renderToString(<AdminShell adminUser={admin()}><p>page body</p></AdminShell>)
    expect(html).not.toContain('role="dialog"')
    expect(html).toContain('data-testid="admin-rail"')
  })

  it('has no drawer control anywhere, at phone or desktop width', () => {
    for (const wide of [false, true]) {
      installMatchMedia(wide)
      const { unmount } = renderShell()
      expect(screen.queryByTestId('admin-menu-button')).toBeNull()
      expect(screen.queryByRole('button', { name: /open menu/i })).toBeNull()
      expect(screen.queryByRole('dialog')).toBeNull()
      unmount()
    }
  })

  it('the desktop rail toggle hides and restores the rail', () => {
    installMatchMedia(true)
    renderShell()
    fireEvent.click(screen.getByTestId('admin-rail-toggle'))
    expect(screen.queryByTestId('admin-rail')).toBeNull()
    fireEvent.click(screen.getByTestId('admin-rail-toggle'))
    expect(screen.getByTestId('admin-rail')).toBeInTheDocument()
  })
})

describe('AdminShell bottom bar', () => {
  it('every rail page is in exactly one group, and no group names a page the rail lacks', () => {
    const railHrefs = [...navigationItems, ...superAdminItems].map(i => i.href).sort()
    const grouped = ADMIN_BOTTOM_GROUPS.flatMap(g => g.hrefs)
    expect([...grouped].sort()).toEqual(railHrefs)
    expect(new Set(grouped).size).toBe(grouped.length)
  })

  it('a super admin gets Home, Business, Study, People and More', () => {
    installMatchMedia(false)
    renderShell()
    expect(groupLabels()).toEqual(['Home', 'Business', 'Study', 'People', 'More'])
  })

  it('a regular admin has no More (all super-admin) and no super-admin page in any shelf', () => {
    installMatchMedia(false)
    renderShell('admin')
    expect(groupLabels()).toEqual(['Home', 'Business', 'Study', 'People'])
    for (const name of ['Business', 'Study', 'People']) {
      fireEvent.click(within(bottomNav()).getByRole('button', { name }))
      const hrefs = within(shelf()!).getAllByRole('link').map(a => a.getAttribute('href'))
      expect(hrefs.filter(h => superAdminItems.some(i => i.href === h))).toEqual([])
    }
    expect(visibleAdminPages(admin('admin')).map(p => p.href)).toEqual(navigationItems.map(i => i.href))
  })

  it('Home is a direct link, active only on /admin itself', () => {
    installMatchMedia(false)
    mockPath = '/admin'
    renderShell()
    expect(within(bottomNav()).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
  })

  it('a group with several pages opens its shelf, and the current page is marked in it', () => {
    installMatchMedia(false)
    mockPath = '/admin/users'
    renderShell()
    const people = within(bottomNav()).getByRole('button', { name: 'People' })
    expect(people.className).toMatch(/text-primary/)
    expect(shelf()).toBeNull()
    fireEvent.click(people)
    expect(people).toHaveAttribute('aria-expanded', 'true')
    const links = within(shelf()!).getAllByRole('link')
    expect(links.map(a => a.getAttribute('href'))).toEqual(['/admin/users', '/admin/support', '/admin/comment-reports', '/admin/nickname-reports'])
    expect(within(shelf()!).getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page')
  })

  it('a super-admin page lights More', () => {
    installMatchMedia(false)
    mockPath = '/admin/webhook-events'
    renderShell()
    expect(within(bottomNav()).getByRole('button', { name: 'More' }).className).toMatch(/text-primary/)
    expect(within(bottomNav()).getByRole('button', { name: 'People' }).className).not.toMatch(/text-primary/)
  })

  it('the shelf closes from X, Escape, a tap outside, a second tap, and navigation', () => {
    installMatchMedia(false)
    const { rerender } = renderShell()
    const study = () => within(bottomNav()).getByRole('button', { name: 'Study' })
    fireEvent.click(study())
    fireEvent.click(within(shelf()!).getByRole('button', { name: 'Close menu' }))
    expect(shelf()).toBeNull()
    fireEvent.click(study())
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(shelf()).toBeNull()
    fireEvent.click(study())
    fireEvent.mouseDown(screen.getByText('page body'))
    expect(shelf()).toBeNull()
    fireEvent.click(study())
    fireEvent.click(study())
    expect(shelf()).toBeNull()
    fireEvent.click(study())
    mockPath = '/admin/bank-qc'
    rerender(<AdminShell adminUser={admin()}><p>page body</p></AdminShell>)
    expect(shelf()).toBeNull()
  })

  it('the bar sits after <main> in the column, so it is in flow and cannot cover page content', () => {
    installMatchMedia(false)
    renderShell()
    const main = screen.getByRole('main')
    expect(main.nextElementSibling).toContainElement(bottomNav())
    expect(main.nextElementSibling!.className).not.toMatch(/\bfixed\b|\babsolute\b/)
    expect(bottomNav().className).not.toMatch(/\bfixed\b|\babsolute\b/)
  })
})
