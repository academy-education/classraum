/**
 * /home is the app's role router, and it is the ONLY guard on itself:
 * middleware passes protected routes through without an auth check, the
 * layout deliberately skips RoleBasedAuthWrapper for /home, and
 * AuthWrapper always renders children. Two of its branches used to
 * `return` with a comment claiming "AuthWrapper will handle redirect to
 * /auth" — it does not, and a signed-out visitor to app.classraum.com
 * sat on the LoadingScreen forever (found live, 2026-08-27).
 *
 * These tests pin the fix: no user → /auth, role fetch failure → /auth.
 */
import React from 'react'
import { render, waitFor } from '@testing-library/react'

const replace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/home',
}))

const authState = {
  user: null as null | { id: string },
  isLoading: false,
  isInitialized: true,
  userDataLoading: false,
}
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}))

jest.mock('@/components/ui/loading-screen', () => ({
  LoadingScreen: () => <div data-testid="loading" />,
}))
jest.mock('@/utils/appInitializationTracker', () => ({
  appInitTracker: { shouldSuppressLoadingForNavigation: () => false },
}))
jest.mock('@/lib/study/currentMode', () => ({ readStoredMode: () => 'grades' }))
jest.mock('@/lib/study/student-entry', () => ({ studentEntryTarget: async () => '/mobile' }))

// The page imports supabase dynamically inside the effect; the role fetch
// is made to FAIL so the error branch is what gets exercised.
jest.mock('@/lib/supabase', () => ({
  db: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: 'boom' } }),
          limit: () => ({ maybeSingle: async () => ({ data: null }) }),
        }),
      }),
    }),
  },
}))

import AppRootPage from '../page'

describe('/home dead-end branches redirect instead of spinning', () => {
  beforeEach(() => replace.mockClear())

  it('sends a signed-out visitor to /auth', async () => {
    authState.user = null
    render(<AppRootPage />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auth'))
  })

  it('sends a signed-in user whose role fetch fails to /auth', async () => {
    authState.user = { id: 'user-1' }
    render(<AppRootPage />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/auth'))
  })
})
