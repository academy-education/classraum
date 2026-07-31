/**
 * Public account-deletion instructions — the URL entered in the Google Play
 * Console "Data deletion" field.
 *
 * Play requires this to be reachable with no account and no login. Two
 * things make that true and both are load-bearing:
 *
 *   1. This route sits OUTSIDE the (app) route group, so it never mounts
 *      AuthWrapper and never redirects an anonymous visitor to /auth.
 *   2. src/middleware.ts allowlists /account-deletion on the app subdomain.
 *      Without that entry the app-subdomain branch falls through to
 *      "redirect unknown routes to /auth" and the page 307s — exactly what
 *      a reviewer would hit, since the native app loads app.classraum.com.
 *
 * Unlike /invite/*, this page SHOULD be indexable: a user who wants to
 * delete their account is expected to find it by searching.
 */
import type { Metadata } from 'next'
import { AccountDeletionGuide } from './AccountDeletionGuide'

export const metadata: Metadata = {
  title: 'Delete your Classraum account · Classraum 계정 삭제',
  description:
    'How to delete your Classraum account and data — in the app, or by email. Includes the 30-day grace period, what is erased, and what is retained.',
  robots: { index: true, follow: true },
}

export default function AccountDeletionPage() {
  return <AccountDeletionGuide />
}
