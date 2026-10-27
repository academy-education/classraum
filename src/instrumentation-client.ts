// Runs in the browser before the app hydrates (Next.js 15.3+). Datadog RUM
// and browser logs start here so the first page view is captured. All the
// settings, and why each one is what it is, live in lib/datadog/rum.ts.
import { datadogRum } from '@datadog/browser-rum'
import { datadogLogs } from '@datadog/browser-logs'
import { nextjsPlugin } from '@datadog/browser-rum-nextjs'
import { rumConfig, logsConfig, rumEnabledFor } from '@/lib/datadog/rum'

if (typeof window !== 'undefined' && rumEnabledFor(window.location.hostname)) {
  const host = window.location.hostname
  datadogRum.init({ ...rumConfig(host), plugins: [nextjsPlugin()] })
  datadogLogs.init(logsConfig(host))
  // Capacitor shell vs browser, so app and web sessions can be told apart.
  const native = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  datadogRum.setGlobalContextProperty('platform', native ? 'native-app' : 'web')
}

export { onRouterTransitionStart } from '@datadog/browser-rum-nextjs'
