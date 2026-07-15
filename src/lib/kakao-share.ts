/**
 * KakaoTalk share via the Kakao JS SDK.
 *
 * Gated on NEXT_PUBLIC_KAKAO_JS_KEY (the Kakao Developers JavaScript app
 * key). When it's unset, `isKakaoShareEnabled()` is false and callers keep
 * their copy-link fallback — nothing is loaded and no button appears.
 *
 * Setup to go live:
 *   1. Create an app at https://developers.kakao.com and copy its
 *      JavaScript key.
 *   2. Under the app's Platform → Web settings, register the site
 *      domain(s) (e.g. https://app.classraum.com and http://localhost:3000).
 *   3. Enable "Kakao Login" is NOT required for Share; Share works with
 *      just the JS key + registered domain.
 *   4. Set NEXT_PUBLIC_KAKAO_JS_KEY in the environment and redeploy.
 */

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js'
const KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY

interface KakaoLink {
  mobileWebUrl?: string
  webUrl?: string
}
interface KakaoStatic {
  isInitialized(): boolean
  init(appKey: string): void
  Share: {
    sendDefault(settings: {
      objectType: 'text' | 'feed'
      text?: string
      link: KakaoLink
      buttonTitle?: string
    }): void
  }
}

declare global {
  interface Window {
    Kakao?: KakaoStatic
  }
}

/** True when a Kakao JS key is configured — build-time constant, so it's
 *  identical on server and client (no hydration mismatch). */
export function isKakaoShareEnabled(): boolean {
  return typeof KEY === 'string' && KEY.length > 0
}

let sdkPromise: Promise<KakaoStatic | null> | null = null

/** Inject + initialize the Kakao SDK once. Resolves null if disabled or
 *  the script fails to load. */
function loadKakao(): Promise<KakaoStatic | null> {
  if (!isKakaoShareEnabled() || typeof window === 'undefined') return Promise.resolve(null)
  if (window.Kakao?.isInitialized()) return Promise.resolve(window.Kakao)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve) => {
    const finish = () => {
      const k = window.Kakao
      if (k && !k.isInitialized()) {
        try { k.init(KEY as string) } catch { /* already initialized elsewhere */ }
      }
      resolve(k ?? null)
    }
    if (window.Kakao) { finish(); return }
    const s = document.createElement('script')
    s.src = KAKAO_SDK_URL
    s.async = true
    s.onload = finish
    s.onerror = () => { sdkPromise = null; resolve(null) }
    document.head.appendChild(s)
  })
  return sdkPromise
}

/**
 * Open the KakaoTalk share sheet with a simple text + link card. Returns
 * false if Kakao is unavailable (caller should fall back to copy-link).
 */
export async function shareToKakao(opts: { text: string; link: string; buttonTitle?: string }): Promise<boolean> {
  const kakao = await loadKakao()
  if (!kakao) return false
  try {
    kakao.Share.sendDefault({
      objectType: 'text',
      text: opts.text,
      link: { mobileWebUrl: opts.link, webUrl: opts.link },
      buttonTitle: opts.buttonTitle,
    })
    return true
  } catch {
    return false
  }
}
