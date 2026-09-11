/**
 * @jest-environment jsdom
 *
 * The admin settings page is auth-gated, so a browser cannot reach it without
 * a password and this render test is the only check that actually exercises
 * the markup — the same reasoning BankQcDashboard.test.tsx records.
 *
 * What it guards: the admin settings page had no way to CHANGE the language.
 * It read `language` (to format the member-since date) and never offered a
 * control, so an admin was stuck with whatever their user_preferences row
 * happened to say. The regular student/teacher settings page has had a
 * switcher the whole time.
 *
 * The assertion that matters is the last one. Rendering a <Select> proves
 * nothing on its own — the bug would be a control that looks right and never
 * writes — so the test drives the real onValueChange and asserts that
 * LanguageContext's setLanguage is called with the new locale. That is the
 * mechanism; the label and the options are decoration around it.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsDashboard } from '../SettingsDashboard'

const setLanguage = jest.fn(async () => {})

// LanguageContext's module pulls in the supabase client, whose ESM realtime
// dependency jest cannot load. Mock the hook rather than the context so the
// component under test still runs its own code unchanged.
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    tList: () => [],
    language: 'english',
    setLanguage,
  }),
}))

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }))
jest.mock('@/lib/logout', () => ({ performLogout: jest.fn() }))

const ADMIN = {
  id: 'u1', email: 'andy@classraum.com', name: 'Andy',
  role: 'super_admin', created_at: '2026-01-01T00:00:00Z',
}

jest.mock('@/lib/supabase', () => ({
  db: {
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: ADMIN, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  },
}))

/* Radix Select renders through a portal driven by floating-ui and guards its
 * trigger with Pointer Events APIs jsdom does not implement. Without these
 * three stubs the listbox never opens and the interaction tests fail for a
 * reason that has nothing to do with the component. */
beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
  Element.prototype.scrollIntoView = jest.fn()
})

describe('admin settings — language', () => {
  beforeEach(() => setLanguage.mockClear())

  it('offers a language control once the profile has loaded', async () => {
    render(<SettingsDashboard />)
    // The page renders a skeleton first; wait for the real form.
    const select = await screen.findByLabelText('admin.settings.language')
    expect(select).toBeInTheDocument()
  })

  it('shows both supported locales', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<SettingsDashboard />)
    await user.click(await screen.findByLabelText('admin.settings.language'))
    const listbox = await screen.findByRole('listbox')
    expect(listbox).toHaveTextContent('English')
    expect(listbox).toHaveTextContent('한국어')
  })

  it('WRITES: choosing a locale calls setLanguage with it', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<SettingsDashboard />)
    await user.click(await screen.findByLabelText('admin.settings.language'))
    await user.click(await screen.findByRole('option', { name: /한국어/ }))
    await waitFor(() => expect(setLanguage).toHaveBeenCalledWith('korean'))
  })
})
