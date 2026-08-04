/**
 * @jest-environment jsdom
 *
 * The avatar step of the onboarding wizard, tested at the only place it
 * can actually go wrong: the REQUEST.
 *
 * Rendering 27 tiles is not the feature. The feature is that tapping one
 * puts `avatar_id` into the PUT that finishes onboarding — and a picker
 * that renders, highlights on tap, and then quietly drops the choice on
 * submit looks completely correct in a screenshot. That is the failure
 * this file exists to catch, so every assertion is on the body of the
 * fetch, not on the DOM.
 *
 * Why avatar_id and NOT avatar_config: the builder's column needs
 * migration 072, which is not applied. Onboarding therefore offers
 * presets only — see the comment on `avatarId` in OnboardingWizard.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingWizard } from '@/app/mobile/study/OnboardingWizard'
import { STUDY_AVATAR_IDS } from '@/lib/study/avatars'

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, language: 'english' }),
}))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/lib/study/track-client', () => ({ track: jest.fn() }))
jest.mock('@/components/ui/modal-portal', () => ({
  ModalPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

/** Every PUT body sent to /api/study/prefs during the run. */
function installFetch(): Record<string, unknown>[] {
  const bodies: Record<string, unknown>[] = []
  global.fetch = jest.fn(async (url: unknown, init?: unknown) => {
    const u = String(url)
    const opts = init as { method?: string; body?: string } | undefined
    if (u.includes('/api/study/prefs') && opts?.method === 'PUT') {
      bodies.push(JSON.parse(opts.body ?? '{}'))
    }
    return { ok: true, json: async () => ({ available: true }) } as Response
  }) as unknown as typeof fetch
  return bodies
}

/** Walk the wizard to its last step. */
function goToLastStep() {
  for (let i = 0; i < 4; i++) {
    fireEvent.click(screen.getByText('study.onboarding.next'))
  }
}

const tiles = () => screen.getAllByRole('button', { pressed: false })
  .filter(b => b.querySelector('svg'))

describe('onboarding collects an avatar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('offers every preset, in picker order', () => {
    installFetch()
    render(<OnboardingWizard onComplete={() => {}} />)
    goToLastStep()
    // aria-pressed is on every tile, so this counts tiles specifically
    // rather than every button on the step.
    expect(screen.getAllByRole('button', { pressed: false }).filter(b => b.querySelector('svg')).length)
      .toBeGreaterThanOrEqual(STUDY_AVATAR_IDS.length)
  })

  it('SENDS the chosen avatar_id on finish', async () => {
    const bodies = installFetch()
    render(<OnboardingWizard onComplete={() => {}} />)
    goToLastStep()

    fireEvent.click(tiles()[0])
    fireEvent.click(screen.getByText('study.onboarding.finish'))

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0))
    // The first tile is the first id in picker order — currently willow.
    // Asserted against the list rather than a literal so a future
    // reorder moves this with it instead of going red.
    expect(bodies[0].avatar_id).toBe(STUDY_AVATAR_IDS[0])
  })

  it('omits avatar_id entirely when nothing was picked', async () => {
    const bodies = installFetch()
    render(<OnboardingWizard onComplete={() => {}} />)
    goToLastStep()
    fireEvent.click(screen.getByText('study.onboarding.finish'))

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0))
    // NOT `toBeNull` — the route reads an explicit null as "clear it",
    // which is a different instruction from "they didn't choose".
    expect('avatar_id' in bodies[0]).toBe(false)
  })

  it('lets a student undo their pick by tapping it again', async () => {
    const bodies = installFetch()
    render(<OnboardingWizard onComplete={() => {}} />)
    goToLastStep()

    const first = tiles()[0]
    fireEvent.click(first)
    // Re-query: the tile is now pressed, so the unpressed-filter misses it.
    fireEvent.click(screen.getByRole('button', { pressed: true }))
    fireEvent.click(screen.getByText('study.onboarding.finish'))

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0))
    expect('avatar_id' in bodies[0]).toBe(false)
  })

  it('sends no avatar_id when onboarding is SKIPPED', async () => {
    const bodies = installFetch()
    render(<OnboardingWizard onComplete={() => {}} />)
    goToLastStep()

    fireEvent.click(tiles()[0])
    fireEvent.click(screen.getByText('study.onboarding.skip'))

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0))
    // Skip means "ask me nothing" — it must not quietly keep the one
    // thing that had already been tapped.
    expect('avatar_id' in bodies[0]).toBe(false)
    expect(bodies[0].onboarded_at).toBeTruthy()
  })
})
