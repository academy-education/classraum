"use client"

/**
 * /pay/return — where the PG sends the buyer back.
 *
 * THE PATH IS THE POINT. This used to live at
 * /mobile/study/billing-redirect, and `/mobile/*` is claimed as a
 * Universal Link in the app's apple-app-site-association:
 *
 *   ["/invite/*", "/mobile/*", "/dashboard/*", "/auth/*"]
 *
 * So when Inicis redirected the buyer back, iOS did not return them to
 * the browser that started the purchase — it handed the URL to the
 * Classraum app. The card window runs in an SFSafariViewController
 * (Capacitor's Browser.open), whose storage is shared with Safari, while
 * the app runs in a WKWebView with its own store. The purchase therefore
 * STARTED in one storage container and FINISHED in another, so
 * takeBillingIntent() found nothing and the buyer was told nothing.
 *
 * Measured, not guessed: a buyer's three checkout_result rows on
 * 2026-08-13 carry ok:true and hasBillingKey:true with NO `kind` field,
 * while every completed purchase carries kind:'plan' — `intent?.kind`
 * serialising to undefined is the intent being null. Her Supabase
 * session survived the same trip (the rows are stamped with her
 * student_id), which is exactly the signature of landing in the app's
 * WebView, where she was already signed in.
 *
 * `/pay/*` is not in the association, so this path stays in the browser
 * that opened it. Chosen over narrowing the AASA claim because iOS
 * caches the association per install: a claim change can take days or a
 * reinstall to take effect, whereas an unclaimed path works on the very
 * next attempt.
 *
 * DO NOT move this back under /mobile, /auth, /dashboard or /invite, and
 * if a path is ever added to APPLE_APP_LINK_PATHS, check it does not
 * swallow this one. deeplinks.test.ts asserts exactly that.
 */
import { BillingReturn } from './BillingReturn'

export default function PayReturnPage() {
  return <BillingReturn />
}
