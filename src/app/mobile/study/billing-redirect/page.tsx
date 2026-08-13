"use client"

/**
 * LEGACY return path — kept alive deliberately, do not delete yet.
 *
 * The PG return moved to /pay/return because `/mobile/*` is claimed as a
 * Universal Link and iOS was pulling the return into the app instead of
 * back to the browser that started the purchase (see the header comment
 * on /pay/return/page.tsx for the measurement).
 *
 * A purchase started BEFORE that deploy already handed Inicis this URL
 * as its redirectUrl, and the PG will use the one it was given. Deleting
 * this route would turn those in-flight returns into a 404 with a
 * registered card and no subscription — the exact failure being fixed.
 * The stashed intent expires after 30 minutes, so this can be removed
 * once no return can still be carrying the old URL.
 */
import { BillingReturn } from '@/app/pay/return/BillingReturn'

export default function BillingRedirectPage() {
  return <BillingReturn />
}
