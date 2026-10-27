import type { RumInitConfiguration } from '@datadog/browser-rum'
import type { LogsInitConfiguration } from '@datadog/browser-logs'

/**
 * Datadog RUM + browser logs (owner decision 2026-10-27, Datadog PoC).
 *
 * The application id and client token are PUBLIC by design: Datadog client
 * tokens are meant to ship in browser bundles and can only submit events.
 * They live here, not in an env var, so the PoC needs no Vercel settings
 * change; NEXT_PUBLIC_DD_RUM_* override them if the app is ever re-created.
 *
 * PRIVACY — read before changing anything below.
 *  - Students, most of them minors, are recorded (owner: yes). So every
 *    replay is MASKED: `defaultPrivacyLevel: 'mask'` hides all text, inputs,
 *    images and links. The owner chose "mask everything".
 *  - `remoteConfiguration` is deliberately NOT used. Datadog's snippet adds
 *    it, and it lets the Datadog UI change the privacy level without a code
 *    change — anyone with Datadog access could unmask a replay of a child's
 *    screen. Masking is decided here, in reviewed code, and nowhere else.
 *  - No user identity is attached (no setUser): no names, emails or ids.
 */
const APPLICATION_ID = process.env.NEXT_PUBLIC_DD_RUM_APPLICATION_ID || '373af3f8-2299-4bdc-856f-55143385c29b'
const CLIENT_TOKEN = process.env.NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN || 'pub353f5a5c3e642078c4c885a15886b4fe'
const SITE = 'datadoghq.com'
const SERVICE = 'classraum-web'

/**
 * Only the real deployment reports. Localhost, previews and dev servers would
 * otherwise fill the PoC with test sessions. NEXT_PUBLIC_DD_RUM_FORCE=1 turns
 * it on anywhere, for testing the wiring.
 */
export function rumEnabledFor(hostname: string, force = process.env.NEXT_PUBLIC_DD_RUM_FORCE === '1'): boolean {
  if (force) return true
  return hostname === 'classraum.com' || hostname.endsWith('.classraum.com')
}

export function envFor(hostname: string): string {
  return rumEnabledFor(hostname, false) ? 'prod' : 'dev'
}

export function rumConfig(hostname: string): RumInitConfiguration {
  return {
    applicationId: APPLICATION_ID,
    clientToken: CLIENT_TOKEN,
    site: SITE,
    service: SERVICE,
    env: envFor(hostname),
    version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || undefined,
    sessionSampleRate: 100,
    // PoC requirement (the Datadog checklist): replay every session during the trial.
    sessionReplaySampleRate: 100,
    defaultPrivacyLevel: 'mask',
    trackResources: true,
    trackUserInteractions: true,
    trackLongTasks: true,
  }
}

export function logsConfig(hostname: string): LogsInitConfiguration {
  return {
    clientToken: CLIENT_TOKEN,
    site: SITE,
    service: SERVICE,
    env: envFor(hostname),
    forwardErrorsToLogs: true,
    sessionSampleRate: 100,
  }
}
