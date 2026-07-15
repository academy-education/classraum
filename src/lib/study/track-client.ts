import { authHeaders } from '@/lib/auth-headers'

/**
 * Client-side funnel event. Fire-and-forget: never awaited by UI, never
 * throws, uses keepalive so an event fired right before a navigation still
 * lands. Only events in the server's CLIENT_TRACKABLE set are recorded.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  void (async () => {
    try {
      const headers = await authHeaders()
      await fetch('/api/study/track', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, props }),
        keepalive: true,
      })
    } catch {
      // Analytics must never affect the user experience.
    }
  })()
}
