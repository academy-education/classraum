/**
 * Thin re-export of the PortOne v2 browser SDK so the subscription
 * page (and any future study purchases) call it through a single
 * import path, plus the two helpers that turn a silent SDK failure
 * into something a person can act on.
 *
 * WHY THE HELPERS EXIST. On 2026-09-26 a buyer pressed "subscribe" ten
 * times in four minutes and never reached PortOne: no prepare call, no
 * PG page, nothing server-side. The npm package is only a LOADER — it
 * injects https://cdn.portone.io/v2/browser-sdk.js at first use and
 * every line of real logic lives in that remote script. If the script
 * cannot load (content blocker, DNS, a network that does not reach the
 * CDN) the loader rejects with the literal
 *
 *     "[PortOne] Failed to load window.PortOne"
 *
 * and — the part that matches the two-second retry rhythm — it CACHES
 * that rejected promise, so every later click on the same page fails
 * instantly without ever re-requesting the script. We showed that
 * message once as "Payment failed" and recorded nothing.
 *
 * So: preload the SDK on mount (the failure is known before the click),
 * name the cause in the copy, and make the only real remedy — a page
 * reload — a button rather than a guess.
 */

import * as PortOneSDK from '@portone/browser-sdk/v2'

export const PortOne = PortOneSDK
export type { IssueBillingKeyResponse } from '@portone/browser-sdk/v2'

/** The loader's own message when the CDN script does not arrive. */
const LOAD_FAILURE = /Failed to load window\.PortOne/i

export function isPortOneLoadFailure(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
  return LOAD_FAILURE.test(msg)
}

/**
 * Trigger the CDN script load without opening anything. Resolves to a
 * failure description when the SDK cannot load, null when it can. Safe
 * to call more than once — the loader memoises.
 *
 * Implemented by calling the SDK with an intentionally invalid request
 * shape is NOT an option (it would open a window), so we go through the
 * loader the same way the SDK does: inject the script tag ourselves if
 * the SDK has not, and wait for it. If `window.PortOne` already exists
 * the CDN script is loaded.
 */
export function preloadPortOne(timeoutMs = 8000): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  const w = window as unknown as { PortOne?: unknown }
  if (w.PortOne) return Promise.resolve(null)
  return new Promise(resolve => {
    const src = 'https://cdn.portone.io/v2/browser-sdk.js'
    let script = Array.from(document.getElementsByTagName('script')).find(s => s.src === src) ?? null
    if (!script) {
      script = document.createElement('script')
      script.src = src
      ;(document.head || document.body).appendChild(script)
    }
    const timer = window.setTimeout(() => resolve('timeout'), timeoutMs)
    script.addEventListener('load', () => { window.clearTimeout(timer); resolve(w.PortOne ? null : 'loaded-without-PortOne') })
    script.addEventListener('error', () => { window.clearTimeout(timer); resolve('script-error') })
  })
}

/**
 * Student-facing copy for a checkout failure. The load failure gets a
 * specific message because the generic one sent a buyer through ten
 * identical retries that could not have worked.
 */
export function describeCheckoutFailure(e: unknown, ko: boolean): string {
  if (isPortOneLoadFailure(e)) {
    return ko
      ? '결제 모듈을 불러오지 못했어요. 광고 차단기나 콘텐츠 차단기를 끄고, 다른 네트워크(예: 모바일 데이터 ↔ Wi‑Fi)로 바꾼 뒤 페이지를 새로고침해 주세요.'
      : 'The payment module could not be loaded. Turn off any ad or content blocker, switch networks (e.g. mobile data ↔ Wi‑Fi), then reload this page.'
  }
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
  return msg || (ko ? '결제에 실패했어요.' : 'Payment failed.')
}
