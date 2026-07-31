'use client'

/**
 * Public, unauthenticated account-deletion instructions.
 *
 * WHY THIS EXISTS: Google Play requires an app that lets users create
 * accounts to offer deletion in two places — inside the app, AND at a public
 * web URL entered in Play Console. Classraum has the in-app half
 * (mobile/profile + settings "Data & Storage"), but every one of those paths
 * is behind auth, so a Play reviewer with no account reaches nothing. This
 * page is the reviewer-reachable half. It is listed in the middleware
 * allowlist for the same reason /invite/ is: the app-subdomain branch
 * otherwise falls through to "redirect unknown routes to /auth".
 *
 * ACCURACY IS THE POINT. Every claim below is traced to code, not to
 * boilerplate. If you change the deletion pipeline, change this page too:
 *
 *   - 30-day window + immediate auth ban ....... src/app/api/account/delete/route.ts
 *   - what blocks deletion ..................... src/app/api/account/check-deletion-eligibility/route.ts
 *   - hard delete + academy cascade ............ src/app/api/cron/process-account-deletions/route.ts
 *   - cancelling during the window ............. src/app/api/account/reactivate/route.ts
 *   - deleted vs retained (SET NULL / anonymize) database/migrations/027, 028
 *   - the audit row that outlives the account .. database/migrations/026
 *
 * Copy lives inline as a `ko` ternary rather than in src/locales, following
 * the convention of the other public/standalone pages (invite/[code],
 * mobile/study/*). A Play reviewer is unlikely to be Korean-speaking and the
 * LanguageProvider defaults to 'korean', so the language switch is local
 * state on top of the provider value — the page must be readable by whoever
 * lands on it, in either language, without an account to hold a preference.
 */

import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

// The reactivation page lives on the MAIN domain. It is deliberately an
// absolute URL: /account/reactivate is not in the middleware's app-subdomain
// allowlist, so a relative link would 307 to /auth for anyone reading this
// page inside the native app (which loads app.classraum.com).
const REACTIVATE_URL = 'https://classraum.com/account/reactivate'
const SUPPORT_EMAIL = 'support@classraum.com'

const GRACE_DAYS = 30

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">
        {children}
      </div>
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-gray-400">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export function AccountDeletionGuide() {
  const { language } = useTranslation()
  // null = follow the provider; set = the reader chose explicitly.
  const [override, setOverride] = useState<'korean' | 'english' | null>(null)
  const ko = (override ?? language) === 'korean'

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-10">
      <div className="mx-auto w-full max-w-2xl">
        {/* Language switch. Not cosmetic: the provider defaults to Korean
            for a signed-out visitor, and this page's whole job is to be
            legible to a stranger. */}
        <div className="flex justify-end gap-1 text-xs">
          <button
            type="button"
            onClick={() => setOverride('english')}
            aria-pressed={!ko}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              !ko
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setOverride('korean')}
            aria-pressed={ko}
            className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
              ko
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
            }`}
          >
            한국어
          </button>
        </div>

        <header className="mt-4">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-500">
            Classraum
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
            {ko ? 'Classraum 계정 삭제' : 'Delete your Classraum account'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {ko
              ? '이 페이지는 Classraum(com.classraum.app) 계정과 관련 데이터를 삭제하는 방법을 안내합니다. 앱 안에서 직접 삭제할 수도 있고, 앱을 사용할 수 없는 경우 이메일로 요청할 수도 있습니다.'
              : 'This page explains how to delete your Classraum (com.classraum.app) account and the data attached to it. You can do it yourself inside the app, or — if you no longer have the app — request it by email.'}
          </p>
        </header>

        {/* The one-paragraph version, up top, because most readers stop here. */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            {ko
              ? '삭제는 즉시 완료되지 않습니다 — 30일 유예 기간이 있습니다'
              : 'Deletion is not immediate — there is a 30-day grace period'}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-amber-800">
            {ko
              ? `삭제를 요청하면 계정은 즉시 비활성화되어 로그인할 수 없게 되고, ${GRACE_DAYS}일 후 영구적으로 삭제됩니다. 이 ${GRACE_DAYS}일 동안에는 마음을 바꿔 계정을 복구할 수 있습니다. ${GRACE_DAYS}일이 지나면 되돌릴 수 없습니다.`
              : `When you request deletion your account is deactivated immediately — you are signed out and can no longer sign in — and it is permanently erased ${GRACE_DAYS} days later. During those ${GRACE_DAYS} days you can change your mind and restore it. After that, it cannot be undone.`}
          </p>
        </div>

        <Section
          title={ko ? '방법 1 — 앱에서 직접 삭제' : 'Option 1 — Delete it yourself in the app'}
        >
          <p>
            {ko
              ? '역할에 따라 화면이 다릅니다.'
              : 'The screen depends on your role.'}
          </p>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">
              {ko
                ? '학생 · 학부모 (모바일 앱)'
                : 'Students and parents (mobile app)'}
            </p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm marker:text-gray-400">
              <li>
                {ko
                  ? '하단 탭에서 프로필을 엽니다.'
                  : 'Open Profile from the bottom navigation bar.'}
              </li>
              <li>
                {ko
                  ? '아래로 스크롤하여 계정 섹션으로 이동합니다.'
                  : 'Scroll down to the Account section.'}
              </li>
              <li>
                {ko ? '계정 삭제를 누릅니다.' : 'Tap Delete Account.'}
              </li>
              <li>
                {ko
                  ? '확인을 위해 계정 이메일 주소를 정확히 입력한 뒤 삭제를 누릅니다.'
                  : 'Type your account email address exactly to confirm, then tap Delete.'}
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-gray-900">
              {ko
                ? '선생님 · 관리자 (대시보드)'
                : 'Teachers and managers (dashboard)'}
            </p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm marker:text-gray-400">
              <li>
                {ko
                  ? '설정으로 이동합니다.'
                  : 'Go to Settings.'}
              </li>
              <li>
                {ko
                  ? '데이터 및 저장공간 탭을 선택합니다.'
                  : 'Select the Data & Storage tab.'}
              </li>
              <li>
                {ko ? '계정 삭제를 누릅니다.' : 'Click Delete Account.'}
              </li>
              <li>
                {ko
                  ? '확인을 위해 계정 이메일 주소를 정확히 입력한 뒤 네, 계정을 삭제합니다를 누릅니다.'
                  : 'Type your account email address exactly to confirm, then click "Yes, Delete My Account".'}
              </li>
            </ol>
          </div>

          <p>
            {ko
              ? '요청이 접수되면 영구 삭제 예정일이 적힌 확인 이메일이 발송됩니다.'
              : 'Once the request goes through, we email you a confirmation that states the date of permanent deletion.'}
          </p>
        </Section>

        <Section
          title={
            ko
              ? '방법 2 — 앱 없이 이메일로 요청'
              : 'Option 2 — Request deletion without the app'
          }
        >
          <p>
            {ko
              ? '앱을 이미 삭제했거나 로그인할 수 없는 경우, 계정에 등록된 이메일 주소에서 아래 주소로 메일을 보내주세요.'
              : 'If you have already uninstalled the app, or cannot sign in, email us from the address registered on the account.'}
          </p>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm">
              <span className="font-medium text-gray-900">
                {ko ? '받는 사람: ' : 'To: '}
              </span>
              <a
                className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                  'Account deletion request / 계정 삭제 요청'
                )}`}
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p className="mt-1.5 text-sm">
              <span className="font-medium text-gray-900">
                {ko ? '제목: ' : 'Subject: '}
              </span>
              {ko ? '계정 삭제 요청' : 'Account deletion request'}
            </p>
            <p className="mt-1.5 text-sm">
              <span className="font-medium text-gray-900">
                {ko ? '내용: ' : 'Body: '}
              </span>
              {ko
                ? '계정 이메일 주소와 이름을 적어주세요.'
                : 'Your account email address and your name.'}
            </p>
          </div>
          <p>
            {ko
              ? `본인 확인 후 앱에서 직접 삭제한 것과 동일한 절차로 처리되며, 동일하게 ${GRACE_DAYS}일 유예 기간이 적용됩니다.`
              : `After we verify that the address belongs to the account, the request goes through exactly the same pipeline as an in-app deletion, including the same ${GRACE_DAYS}-day grace period.`}
          </p>
        </Section>

        <Section title={ko ? '진행 순서' : 'Timeline'}>
          <ol className="space-y-3">
            <li className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">
                {ko ? '요청 즉시' : 'Immediately on request'}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {ko
                  ? '계정이 삭제 예정으로 표시되고 로그인이 차단됩니다. 즉시 로그아웃되며 다시 로그인할 수 없습니다. 예정일이 적힌 확인 이메일이 발송됩니다.'
                  : 'Your account is marked for deletion and sign-in is blocked. You are signed out and cannot sign back in. A confirmation email with the scheduled date is sent.'}
              </p>
            </li>
            <li className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">
                {ko ? `1일 ~ ${GRACE_DAYS}일` : `Days 1 to ${GRACE_DAYS}`}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {ko
                  ? '데이터는 아직 삭제되지 않은 상태로 보관됩니다. 이 기간에는 취소할 수 있습니다.'
                  : 'Your data is still held, unerased. You can cancel during this period.'}
              </p>
            </li>
            <li className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">
                {ko ? `${GRACE_DAYS}일 이후` : `After day ${GRACE_DAYS}`}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {ko
                  ? `매일 실행되는 자동 작업(한국 시간 정오)이 ${GRACE_DAYS}일이 지난 계정을 영구 삭제합니다. 로그인 정보와 계정이 완전히 제거되며, 삭제 완료 이메일이 발송됩니다. 이 시점부터는 복구가 불가능합니다.`
                  : `A daily automated job (12:00 KST) permanently erases accounts whose ${GRACE_DAYS} days have elapsed. Your sign-in identity and account are removed and a final "deleted" email is sent. From this point it cannot be recovered.`}
              </p>
            </li>
          </ol>
        </Section>

        <Section
          title={
            ko
              ? `마음이 바뀌었다면 (${GRACE_DAYS}일 이내)`
              : `Changed your mind (within ${GRACE_DAYS} days)`
          }
        >
          <p>
            {ko
              ? '유예 기간 중에는 계정 복구 페이지에서 계정 이메일과 비밀번호를 입력하면 계정이 그대로 복원됩니다. 삭제 예약이 해제되고 로그인이 다시 가능해집니다.'
              : 'During the grace period, enter your account email and password on the reactivation page and the account is restored as it was. The scheduled deletion is cancelled and sign-in works again.'}
          </p>
          <p>
            <a
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
              href={REACTIVATE_URL}
            >
              {REACTIVATE_URL}
            </a>
          </p>
        </Section>

        <Section title={ko ? '삭제되는 데이터' : 'What is deleted'}>
          <Bullets
            items={
              ko
                ? [
                    '로그인 정보(인증 계정)와 프로필 — 이름, 이메일, 전화번호, 프로필 사진',
                    '학원 내 역할 기록(학생 · 학부모 · 선생님 · 관리자)과 가족 연결',
                    '성적, 출결 기록, 수업 등록 정보, 과제 댓글',
                    '알림, 앱 설정, 푸시 알림 기기 등록 정보',
                    '메시지 및 고객 지원 대화',
                    '학습(Study) 데이터 — 모의고사 응시 기록과 결과, 크레딧 잔액 및 사용 내역, 학습 구독, 추천인 · 친구 · 챌린지 기록',
                  ]
                : [
                    'Your sign-in identity and profile — name, email, phone number, profile photo',
                    'Your role record at your academy (student, parent, teacher, manager) and family links',
                    'Grades, attendance records, classroom enrolments, assignment comments',
                    'Notifications, app preferences, push-notification device registrations',
                    'Messages and support conversations',
                    'Study data — practice test attempts and results, credit balance and ledger, study subscription, referrals, friends and challenges',
                  ]
            }
          />
        </Section>

        <Section title={ko ? '보관되는 데이터와 그 이유' : 'What is kept, and why'}>
          <p>
            {ko
              ? '아래 항목은 법령상 보존 의무 또는 학원 운영을 위해 남습니다. 남는 경우에도 개인 식별 정보는 제거됩니다.'
              : 'The following survive deletion, either because we are legally required to keep them or because they belong to your academy rather than to you. Where they survive, the personal details are stripped out.'}
          </p>
          <Bullets
            items={
              ko
                ? [
                    '수강료 청구서 — 세무 · 회계 목적으로 보관됩니다. 청구서 이름은 “[deleted account]”로 대체되고, 메모는 삭제되며, 회원 연결은 해제됩니다.',
                    '구독 결제 내역 — 세무 목적으로 보관되며, 학원과의 연결은 해제됩니다.',
                    '학원에 속한 콘텐츠 — 공지사항, 과제에 업로드한 파일, 작성한 성적표, 담당 수업 배정. 내용은 남고 작성자 표시만 제거됩니다(담당 없음 상태). 학원 관리자가 다시 배정할 수 있습니다.',
                    '삭제 감사 기록 — 삭제가 실제로 이루어졌음을 증명하기 위해, 요청 당시의 사용자 ID · 이메일 · 이름 · 역할, 요청 및 삭제 시각, 요청 IP 주소와 브라우저 정보, 입력한 삭제 사유가 남습니다. 이 기록은 계정 삭제 후에도 유지됩니다.',
                  ]
                : [
                    'Tuition invoices — retained for tax and accounting. The invoice name is replaced with “[deleted account]”, notes are cleared, and the link to you is removed.',
                    'Subscription billing records — retained for tax purposes, with the link to the academy removed.',
                    'Content that belongs to your academy — announcements, files you uploaded to assignments, reports you wrote, classrooms you taught. The content stays; your authorship link is removed (the record simply has no author, and a manager can reassign it).',
                    'A deletion audit record — so we can prove the deletion actually happened. It keeps your user id, email, name and role as of the request, the request and deletion timestamps, the IP address and browser the request came from, and any reason you gave. This record outlives the account.',
                  ]
            }
          />
        </Section>

        <Section
          title={
            ko
              ? '주의: 학원의 유일한 관리자인 경우'
              : 'Important: if you are the sole manager of an academy'
          }
        >
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm leading-relaxed text-rose-900">
              {ko
                ? '학원에 다른 관리자가 없는 상태에서 계정을 삭제하면, 학원 전체가 함께 영구 삭제됩니다 — 모든 수업, 세션, 과제, 출결, 결제 정보가 삭제되고, 해당 학원의 모든 학생 · 학부모 · 선생님 계정도 함께 삭제됩니다.'
                : 'If your academy has no other manager, deleting your account also permanently closes the entire academy — every classroom, session, assignment, attendance record and payment record — and hard-deletes the accounts of every other member (students, parents, teachers).'}
            </p>
          </div>
          <Bullets
            items={
              ko
                ? [
                    '이 경우 삭제 확인 화면에서 별도의 추가 동의를 체크해야만 진행됩니다.',
                    `해당 학원의 다른 모든 구성원에게 ${GRACE_DAYS}일 전에 폐쇄 안내 이메일이 발송됩니다.`,
                    '등록된 결제 수단(빌링키)은 삭제 처리 시 해지됩니다.',
                    '학원을 유지하고 본인 계정만 삭제하려면, 먼저 다른 관리자를 초대해 관리자로 지정한 뒤 삭제를 요청하세요.',
                  ]
                : [
                    'Because of that, this path requires an extra explicit confirmation on the delete screen — it cannot happen by a mistaken tap.',
                    `Every other member of the academy is emailed a closure notice ${GRACE_DAYS} days in advance.`,
                    'The saved payment method (billing key) is cancelled as part of the deletion.',
                    'If you want to keep the academy and remove only yourself, invite and promote another manager first, then request deletion.',
                  ]
            }
          />
        </Section>

        <Section title={ko ? '삭제할 수 없는 계정' : 'Accounts that cannot be self-deleted'}>
          <p>
            {ko
              ? `Classraum 운영자(admin · super_admin) 계정은 이 절차로 삭제할 수 없습니다. 해당 계정의 삭제가 필요하면 ${SUPPORT_EMAIL} 로 문의해 주세요. 그 외의 계정은 미납 청구서가 있어도 삭제가 차단되지 않습니다.`
              : `Classraum staff accounts (admin and super_admin) cannot be deleted through this flow — contact ${SUPPORT_EMAIL} if one needs to be removed. For everyone else nothing blocks deletion; an unpaid invoice does not stop it.`}
          </p>
        </Section>

        <Section title={ko ? '문의' : 'Questions'}>
          <p>
            {ko ? '문의: ' : 'Contact: '}
            <a
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p>
            <a
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
              href="https://classraum.com/privacy-policy"
            >
              {ko ? '개인정보처리방침' : 'Privacy Policy'}
            </a>
          </p>
        </Section>

        <footer className="mt-12 border-t border-gray-200 pt-5 text-xs text-gray-500">
          {ko
            ? 'Classraum · com.classraum.app'
            : 'Classraum · com.classraum.app'}
        </footer>
      </div>
    </main>
  )
}
