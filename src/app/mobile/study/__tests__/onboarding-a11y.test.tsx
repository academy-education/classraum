/**
 * @jest-environment jsdom
 *
 * The onboarding wizard is a REQUIRED modal: it takes focus and keeps it,
 * but — unlike every other study sheet that uses useDialogA11y — Escape
 * must not dismiss it. Skip is the only way out, and Skip still saves.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingWizard } from '@/app/mobile/study/OnboardingWizard'

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, language: 'english' }),
}))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/lib/study/track-client', () => ({ track: jest.fn() }))
jest.mock('@/components/ui/modal-portal', () => ({
  ModalPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ available: true }) }) as Response) as unknown as typeof fetch
})

describe('onboarding wizard focus management', () => {
  it('moves focus into the dialog on open and labels it by the step title', () => {
    render(<OnboardingWizard onComplete={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
    expect(dialog.getAttribute('aria-labelledby')).toBe('onboarding-step-title')
    expect(document.getElementById('onboarding-step-title')?.textContent).toBe('study.onboarding.step1Title')
  })

  it('Escape does NOT close it (the wizard is required)', () => {
    const onComplete = jest.fn()
    render(<OnboardingWizard onComplete={onComplete} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('advancing a step moves focus to the new step heading, inside the dialog', () => {
    render(<OnboardingWizard onComplete={() => {}} />)
    fireEvent.click(screen.getByText('study.onboarding.next'))
    const heading = document.getElementById('onboarding-step-title')!
    expect(heading.textContent).not.toBe('study.onboarding.step1Title')
    expect(document.activeElement).toBe(heading)
  })
})
