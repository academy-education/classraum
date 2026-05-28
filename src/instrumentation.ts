// Next.js instrumentation hook — runs once per server lifecycle (Node) /
// edge runtime cold start. Wires Sentry into both contexts.
//
// The browser is wired separately by sentry.client.config.ts via
// withSentryConfig in next.config.ts.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

// Re-export the Sentry helper so React Server Component errors get
// captured. Without this, RSC errors are swallowed silently.
// Next.js's onRequestError contract matches what Sentry expects, so we
// pass through directly.
export { captureRequestError as onRequestError } from '@sentry/nextjs'
