/**
 * Public invite landing — the URL a student actually shares.
 *
 * THIS PAGE DOES NOT REDEEM ANYTHING. Referral redemption already lives in
 * /auth (it reads ?ref, prefills and locks the input, persists the code via
 * pending-referral so it survives email confirmation, and redeems once a
 * session exists). Duplicating that here would create a second writer for
 * the same reward. This page hands off to it.
 *
 * What it adds is the case /auth cannot cover: a recipient WITHOUT the app.
 * Until now an invite landed them on a signup form in mobile Safari with no
 * indication an app existed — there was not a single App Store or Play Store
 * link anywhere in the codebase.
 *
 * Why /invite/* and not store buttons bolted onto /auth: for iOS to open the
 * app, the path must be claimed in the AASA. Claiming /auth would mean the
 * installed app intercepts EVERY /auth URL, including Supabase
 * email-confirmation and OAuth callback redirects. That is a large blast
 * radius for a referral feature, so the claim stays scoped to /invite/*.
 *
 * Rendering is deliberately code-only — no lookup of who owns the code. See
 * isWellFormedReferralCode for why (enumeration).
 */
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isWellFormedReferralCode, normalizeReferralCode } from '@/lib/study/referral'
import { InviteLanding } from './InviteLanding'

export const metadata: Metadata = {
  title: 'Classraum 초대 · Join me on Classraum',
  description: 'Study for the SAT, TOEFL and 수능 with AI-generated practice tests.',
  // A shared link should never end up in search results keyed to someone's code.
  robots: { index: false, follow: false },
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const normalized = normalizeReferralCode(decodeURIComponent(code))
  if (!isWellFormedReferralCode(normalized)) notFound()
  return <InviteLanding code={normalized} />
}
