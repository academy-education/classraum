/**
 * Remember how this device last signed in, so the sign-in screen can mark
 * that button "last used". People create duplicate accounts because they
 * cannot remember which button they pressed last time — Apple's Hide My
 * Email makes even the address useless as a reminder. Device-local by
 * design; it is a hint, not identity.
 */
export type SignInMethod = 'password' | 'google' | 'apple' | 'kakao'
export const LAST_SIGN_IN_KEY = 'classraum.lastSignInMethod.v1'
const METHODS: ReadonlySet<string> = new Set(['password', 'google', 'apple', 'kakao'])

export interface KeyValueStore { getItem(k: string): string | null; setItem(k: string, v: string): void }

function defaultStore(): KeyValueStore | null {
  try { return typeof window !== 'undefined' ? window.localStorage : null } catch { return null }
}

export function rememberSignInMethod(method: string | null | undefined, store: KeyValueStore | null = defaultStore()): void {
  if (!store || !method || !METHODS.has(method)) return
  try { store.setItem(LAST_SIGN_IN_KEY, method) } catch { /* private mode etc. */ }
}

export function readSignInMethod(store: KeyValueStore | null = defaultStore()): SignInMethod | null {
  if (!store) return null
  try {
    const v = store.getItem(LAST_SIGN_IN_KEY)
    return v && METHODS.has(v) ? (v as SignInMethod) : null
  } catch { return null }
}
