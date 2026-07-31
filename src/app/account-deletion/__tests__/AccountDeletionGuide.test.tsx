/**
 * ACCURACY guard for the public account-deletion page.
 *
 * A deletion page that contradicts the deletion code is worse than no page —
 * it is a false statement about what happens to a user's data, published at
 * a URL a store reviewer and a regulator both read. These assertions pin the
 * handful of claims that are load-bearing, each traceable to a specific part
 * of the pipeline:
 *
 *   - 30 days, not immediate .... api/account/delete (hardDeletionDate)
 *                                 + cron GRACE_PERIOD_DAYS = 30
 *   - reversible in-window ...... api/account/reactivate
 *   - invoices retained ......... migration 027 ('[deleted account]')
 *   - academy cascade ........... migration 028 + cron runAcademyCascade
 *   - admin cannot self-delete .. check-deletion-eligibility
 *                                 ('unsupported_role')
 *
 * If someone shortens the grace period or makes deletion immediate, the
 * timeline assertion fails and forces this page to be re-read. That is the
 * point: a stale legal page passes every other test in the repo.
 *
 * Reachability is guarded separately in middleware-reachability.test.ts —
 * the two fail independently and neither is visible from the other.
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AccountDeletionGuide } from '../AccountDeletionGuide'

// The LanguageProvider is not mounted in this test tree; the real hook would
// throw. 'korean' is the provider's own default for a signed-out visitor, so
// this reproduces what an anonymous reviewer actually gets on first paint.
let providerLanguage = 'korean'
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    language: providerLanguage,
    t: (k: string) => k,
    tList: () => [],
    setLanguage: jest.fn(),
  }),
}))

describe('AccountDeletionGuide content matches the deletion pipeline', () => {
  beforeEach(() => {
    providerLanguage = 'korean'
  })

  async function renderInEnglish() {
    const user = userEvent.setup()
    render(<AccountDeletionGuide />)
    await user.click(screen.getByRole('button', { name: 'English' }))
  }

  it('defaults to the provider language and can be switched by a reader with no account', async () => {
    const user = userEvent.setup()
    render(<AccountDeletionGuide />)
    // Provider default is Korean; an English-speaking store reviewer must
    // still be able to read the page without signing in anywhere.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Classraum 계정 삭제'
    )
    await user.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Delete your Classraum account'
    )
  })

  it('states deletion is deferred by 30 days, not immediate', async () => {
    await renderInEnglish()
    expect(
      screen.getByText(/Deletion is not immediate — there is a 30-day grace period/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/permanently erased 30 days later/)
    ).toBeInTheDocument()
  })

  it('states the account is deactivated and sign-in blocked at request time', async () => {
    await renderInEnglish()
    // api/account/delete bans the auth identity in the same request.
    expect(
      screen.getByText(/signed out and cannot sign back in/)
    ).toBeInTheDocument()
  })

  it('documents the in-window cancellation route (api/account/reactivate)', async () => {
    await renderInEnglish()
    expect(
      screen.getByRole('link', { name: 'https://classraum.com/account/reactivate' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/enter your account email and password on the reactivation page/)
    ).toBeInTheDocument()
  })

  it('offers a no-app deletion route (Play requires one that is not in-app)', async () => {
    await renderInEnglish()
    const mailtos = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.startsWith('mailto:support@classraum.com'))
    expect(mailtos.length).toBeGreaterThan(0)
    expect(
      screen.getByText(/If you have already uninstalled the app, or cannot sign in/)
    ).toBeInTheDocument()
  })

  it('discloses that invoices are retained and anonymized, per migration 027', async () => {
    await renderInEnglish()
    expect(
      screen.getByText(/Tuition invoices — retained for tax and accounting/)
    ).toBeInTheDocument()
    // The literal string the cascade writes into invoice_name.
    expect(screen.getByText(/\[deleted account\]/)).toBeInTheDocument()
  })

  it('discloses that the audit record outlives the account', async () => {
    await renderInEnglish()
    // account_deletion_log keeps email + name + IP after the user is gone.
    // Omitting this would make the page a false privacy statement.
    expect(
      screen.getByText(/This record outlives the account/)
    ).toBeInTheDocument()
  })

  it('warns that sole-manager deletion cascades to the academy and its members', async () => {
    await renderInEnglish()
    const heading = screen.getByRole('heading', {
      name: /if you are the sole manager of an academy/i,
    })
    const section = heading.closest('section')
    expect(section).not.toBeNull()
    expect(
      within(section as HTMLElement).getByText(
        /hard-deletes the accounts of every other member/
      )
    ).toBeInTheDocument()
    expect(
      within(section as HTMLElement).getByText(/closure notice 30 days in advance/)
    ).toBeInTheDocument()
  })

  it('states admin accounts cannot self-delete, per check-deletion-eligibility', async () => {
    await renderInEnglish()
    expect(
      screen.getByText(/Classraum staff accounts \(admin and super_admin\) cannot be deleted/)
    ).toBeInTheDocument()
  })

  it('gives concrete in-app steps for both surfaces', async () => {
    await renderInEnglish()
    // Students/parents land on /mobile/profile; managers/teachers on the
    // settings page's "data" section (settings.sections.data = "Data & Storage").
    expect(
      screen.getByText(/Open Profile from the bottom navigation bar/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Select the Data & Storage tab/)
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/Type your account email address exactly to confirm/)
    ).toHaveLength(2)
  })

  it('renders the same load-bearing facts in Korean', async () => {
    providerLanguage = 'korean'
    render(<AccountDeletionGuide />)
    expect(screen.getByText(/30일 유예 기간이 있습니다/)).toBeInTheDocument()
    expect(screen.getByText(/프로필을 엽니다/)).toBeInTheDocument()
    expect(screen.getByText(/데이터 및 저장공간 탭을 선택합니다/)).toBeInTheDocument()
    expect(screen.getByText(/학원 전체가 함께 영구 삭제됩니다/)).toBeInTheDocument()
  })
})
