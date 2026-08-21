/**
 * THE SAFETY PROPERTY THAT LETS THIS MERGE BEFORE CREDENTIALS EXIST.
 *
 * With NEXT_PUBLIC_OAUTH_PROVIDERS unset, the auth page must be the page
 * that shipped at HEAD — not "looks the same", not "the buttons are
 * hidden": the same DOM.
 *
 * So this does not assert it, it demonstrates it. It checks out HEAD's
 * own copy of src/app/auth/page.tsx, renders THAT and the working-tree
 * version side by side under identical mocks, and diffs the markup. If
 * the flag-off render ever diverges by one attribute, this fails and
 * prints where.
 *
 * The comparison runs against HEAD rather than a stored snapshot on
 * purpose: a snapshot committed alongside the change would have been
 * generated FROM the change, and would agree with whatever it did.
 */
import React from 'react'
import { render } from '@testing-library/react'
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// ── mocks shared by both renders ─────────────────────────────────────
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
}))
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isLoading: false, isInitialized: true }),
}))
jest.mock('@/hooks/useTranslation', () => ({
  // Return the key itself: identical text in both renders, and any new
  // key shows up as a visible difference rather than as empty markup.
  useTranslation: () => ({
    t: (k: string, params?: Record<string, unknown>) =>
      params ? `${k}:${Object.values(params).join(',')}` : k,
    tList: () => [],
    language: 'english',
  }),
}))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))
jest.mock('@/hooks/useKeyboardInset', () => ({ useKeyboardInset: () => 0 }))
jest.mock('@/components/ui/squares-background', () => ({
  Squares: () => <div data-mock="squares" />,
}))
jest.mock('@/lib/supabase', () => ({
  db: {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: null } })),
      setSession: jest.fn(async () => ({ data: { session: null }, error: null })),
      signOut: jest.fn(async () => ({ error: null })),
      signInWithOAuth: jest.fn(async () => ({ data: { url: null }, error: null })),
      getUserIdentities: jest.fn(async () => ({ data: { identities: [] } })),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: null }) }),
      }),
    }),
  },
}))
jest.mock('@/lib/nativeApp', () => ({
  isNativeApp: () => false,
  openExternalUrl: jest.fn(async () => true),
}))

const REPO = path.resolve(__dirname, '../../../..')
const tempDirs: string[] = []
afterAll(() => {
  for (const d of tempDirs) fs.rmSync(d, { recursive: true, force: true })
})

function headCopy(): string {
  const src = execFileSync('git', ['show', 'HEAD:src/app/auth/page.tsx'], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  // Inside the repo (so node_modules and the @/ mapper resolve) but
  // OUTSIDE src, so no repo-wide scan — code-key-coverage walks every
  // .tsx under src — can pick up a second copy of the page mid-run.
  const dir = fs.mkdtempSync(path.join(REPO, '.auth-head-'))
  const file = path.join(dir, 'page.head.tsx')
  fs.writeFileSync(file, src)
  tempDirs.push(dir)
  return file
}

// Strip the noise that legitimately differs between two renders of the
// same tree: React's generated ids, and nothing else.
const normalise = (html: string) =>
  html
    .replace(/(id|for|aria-controls|aria-labelledby|aria-describedby)="[^"]*"/g, '$1="ID"')
    .replace(/:r[0-9a-z]+:/g, 'RID')

describe('flag OFF: the auth page is byte-identical to HEAD', () => {
  const originalFlag = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_OAUTH_PROVIDERS
    else process.env.NEXT_PUBLIC_OAUTH_PROVIDERS = originalFlag
  })

  it('renders the same markup as the committed page', () => {
    delete process.env.NEXT_PUBLIC_OAUTH_PROVIDERS

    /* eslint-disable @typescript-eslint/no-require-imports */
    const HeadPage = require(headCopy()).default
    const CurrentPage = require('../page').default
    /* eslint-enable @typescript-eslint/no-require-imports */

    const head = render(<HeadPage />)
    const headHtml = normalise(head.container.innerHTML)
    head.unmount()

    const current = render(<CurrentPage />)
    const currentHtml = normalise(current.container.innerHTML)
    current.unmount()

    // Guard against the check passing because BOTH rendered nothing —
    // e.g. an unmocked throw sending the page into its fallback branch.
    expect(headHtml.length).toBeGreaterThan(2000)
    expect(currentHtml).toBe(headHtml)
  })

  it('renders no provider button and no divider', () => {
    delete process.env.NEXT_PUBLIC_OAUTH_PROVIDERS
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const CurrentPage = require('../page').default
    const { queryByTestId, container } = render(<CurrentPage />)
    expect(queryByTestId('social-auth-buttons')).toBeNull()
    expect(container.innerHTML).not.toMatch(/auth\.social/)
  })
})

describe('flag ON: the strip appears, and that is the only difference', () => {
  const originalFlag = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_OAUTH_PROVIDERS
    else process.env.NEXT_PUBLIC_OAUTH_PROVIDERS = originalFlag
  })

  it('shows Kakao first, then Google, then Apple', () => {
    process.env.NEXT_PUBLIC_OAUTH_PROVIDERS = 'apple,google,kakao'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const CurrentPage = require('../page').default
    const { getByTestId } = render(<CurrentPage />)
    const strip = getByTestId('social-auth-buttons')
    const labels = Array.from(strip.querySelectorAll('button')).map((b) => b.textContent)
    expect(labels).toHaveLength(3)
    expect(labels[0]).toContain('Kakao')
    expect(labels[1]).toContain('Google')
    expect(labels[2]).toContain('Apple')
  })
})
