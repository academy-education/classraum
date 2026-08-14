import type { Metadata, Viewport } from 'next'
import { Montserrat, Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import { LanguageWrapper } from './language-wrapper'
import { CommandPaletteProvider } from '@/contexts/CommandPaletteContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { GlobalHaptics } from '@/components/GlobalHaptics'
import { SupportedLanguage } from '@/locales'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
})

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-noto-sans-kr',
})

// Viewport must be exported separately in Next.js 14+
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // Required for safe-area-inset-* CSS env variables
}

export const metadata: Metadata = {
  title: 'Classraum - Academy Management Platform',
  description: 'A comprehensive academy management platform for teachers, students, and parents.',
  // Explicit icons so Next.js emits <link rel="icon"> on every page. Without
  // this, the favicon is fetched implicitly from /favicon.ico — which works
  // on the apex but tends to get cached as 404 on subdomains until the user
  // hard-refreshes. The SVG is preferred where supported; the .ico is the
  // legacy fallback for the rest.
  // The `?v=N` query bumps any time the icon files change. Browsers cache
  // favicons very aggressively and skip etag revalidation, so without the
  // version query an updated favicon can stay stale for weeks (especially
  // on subdomains, which keep their own cache entry). Bump on every icon
  // refresh.
  icons: {
    icon: [
      { url: '/favicon.svg?v=2', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=2', sizes: 'any' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: '/logo-icon.png?v=2',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default', // 'default' = black text on white background
    title: 'Classraum',
  },
  other: {
    'theme-color': '#FFFFFF',
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // DO NOT read cookies() here. It forces every route dynamic, and this
  // app has BOTH src/app/page.tsx and src/app/(app)/page.tsx mapping to
  // "/" (papered over by scripts/fix-client-manifest.js) — dynamic
  // rendering of "/" 500s on Vercel (www.classraum.com went down when we
  // tried). The language flicker this reintroduces needs a scoped fix
  // (e.g. per-surface cookie read below the root), not root-level dynamic.
  const initialLanguage: SupportedLanguage = 'korean'

  return (
    // suppressHydrationWarning: the theme boot script below adds the
    // .dark class before React hydrates — expected mismatch, same
    // pattern next-themes uses.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Explicit viewport meta for Capacitor/iOS WebView - ensures safe-area-inset-* CSS env variables work */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        {/* Colour scheme, stated before the stylesheet is fetched. Without
            it a dark-OS viewer sees the UA's dark canvas until our CSS
            lands — the "sometimes loads in dark mode" flash. Must stay in
            sync with :root{color-scheme} in globals.css. */}
        <meta name="color-scheme" content="light" />
        {/* Add .native-app class to <html> when running in Capacitor so viewport-locking
            CSS in globals.css applies on iOS/Android but not on the web. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){document.documentElement.classList.add('native-app')}}catch(e){}})();`,
          }}
        />
        {/* Pre-paint theme script — REMOVED 2026-08-11, dark mode is off
            everywhere (see darkAllowed in hooks/useTheme.ts, which must
            stay in sync with this).

            This used to add `.dark` before first paint for /mobile so
            dark users saw no white flash. With dark disabled it would do
            the exact opposite: paint dark for anyone whose persisted
            theme is still 'dark' (or whose OS is dark and theme is
            'system'), and then React would strip the class on mount —
            a dark flash on every cold load, on the surfaces we were
            asked to make light. The stale localStorage value is
            deliberately left alone rather than migrated; nothing reads
            it while dark is off, and clearing it would log users out of
            a preference we may restore. */}
      </head>
      <body
        className={`${montserrat.variable} ${notoSansKR.variable} ${montserrat.className}`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <LanguageWrapper initialLanguage={initialLanguage}>
            <CommandPaletteProvider>
              {children}
              <ToastProvider />
              {/* One delegated listener for every button in the app —
                  see components/GlobalHaptics.tsx. Renders nothing. */}
              <GlobalHaptics />
            </CommandPaletteProvider>
          </LanguageWrapper>
        </AuthProvider>
      </body>
    </html>
  )
}