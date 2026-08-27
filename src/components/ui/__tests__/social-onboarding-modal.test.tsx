import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SocialOnboardingModal } from '@/components/ui/social-onboarding-modal'

jest.mock('@/lib/supabase', () => ({ db: { auth: { signOut: jest.fn(async () => ({})) } } }))
const bump = jest.fn()
jest.mock('@/lib/ui/profile-refresh', () => ({ bumpProfileRefresh: () => bump() }))
jest.mock('@/lib/auth-headers', () => ({ authHeaders: async () => ({}) }))
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: jest.fn() }) }))
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'english' }) }))
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (k: string) => k, tList: () => [] }),
}))

describe('social onboarding modal', () => {
  beforeEach(() => { bump.mockClear(); global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true }) })) as unknown as typeof fetch })

  it('prefills the name from provider metadata, split into 성/이름', () => {
    render(<SocialOnboardingModal isOpen userMetadata={{ full_name: '홍길동' }} onCompleted={jest.fn()} />)
    expect((screen.getByLabelText(/familyName|성/i) as HTMLInputElement).value).toBe('홍')
  })

  it('has NO dismissal affordance — it is a wall', () => {
    // MUST query `screen`, not `container`: ModalShell renders through
    // createPortal into document.body, so a container query finds
    // nothing whether the close button exists or not — which is exactly
    // how the first version of this test passed with the wall removed.
    render(<SocialOnboardingModal isOpen userMetadata={{}} onCompleted={jest.fn()} />)
    expect(screen.queryByLabelText('Close')).toBeNull()
    expect(screen.queryByRole('button', { name: /cancel|skip|later/i })).toBeNull()
  })

  it('offers sign-out so it can never be a trap', () => {
    render(<SocialOnboardingModal isOpen userMetadata={{}} onCompleted={jest.fn()} />)
    expect(screen.getByText('auth.socialOnboarding.signOut')).toBeInTheDocument()
  })

  it('refuses to submit without a plausible phone', async () => {
    const onCompleted = jest.fn()
    render(<SocialOnboardingModal isOpen userMetadata={{ full_name: '홍길동' }} onCompleted={onCompleted} />)
    fireEvent.click(screen.getByText('auth.socialOnboarding.submit'))
    await waitFor(() => expect(global.fetch).not.toHaveBeenCalled())
    expect(onCompleted).not.toHaveBeenCalled()
  })

  it('tells the profile page to re-read, after a SUCCESSFUL write', async () => {
    // Without this the user finishes onboarding and lands on a profile
    // page still showing the provider nickname and a blank phone.
    render(<SocialOnboardingModal isOpen userMetadata={{ full_name: '홍길동' }} onCompleted={jest.fn()} />)
    fireEvent.change(screen.getByLabelText(/phoneLabel/i), { target: { value: '010-1234-5678' } })
    fireEvent.click(screen.getByText('auth.socialOnboarding.submit'))
    await waitFor(() => expect(bump).toHaveBeenCalledTimes(1))
  })

  it('does NOT announce when the write fails', async () => {
    // A bump for a write that did not land would make every reader
    // refetch and render the OLD row as though it were new.
    global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({ error: 'update_failed' }) })) as unknown as typeof fetch
    const onCompleted = jest.fn()
    render(<SocialOnboardingModal isOpen userMetadata={{ full_name: '홍길동' }} onCompleted={onCompleted} />)
    fireEvent.change(screen.getByLabelText(/phoneLabel/i), { target: { value: '010-1234-5678' } })
    fireEvent.click(screen.getByText('auth.socialOnboarding.submit'))
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(bump).not.toHaveBeenCalled()
    expect(onCompleted).not.toHaveBeenCalled()
  })
})
