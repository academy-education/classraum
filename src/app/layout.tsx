import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Montserrat, Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import { LanguageWrapper } from './language-wrapper'
import { CommandPaletteProvider } from '@/contexts/CommandPaletteContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/ToastProvider'
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read the language cookie server-side so the FIRST paint is already in
  // the user's language. Hardcoding 'korean' here made every English
  // user's page flash Korean, then flip after hydration when the client
  // read the cookie — the "language flicker" on every load.
  const cookieStore = await cookies()
  const cookieLang = cookieStore.get('classraum_language')?.value
  const initialLanguage: SupportedLanguage = cookieLang === 'english' ? 'english' : 'korean'

  return (
    // suppressHydrationWarning: the theme boot script below adds the
    // .dark class before React hydrates — expected mismatch, same
    // pattern next-themes uses.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Explicit viewport meta for Capacitor/iOS WebView - ensures safe-area-inset-* CSS env variables work */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        {/* Add .native-app class to <html> when running in Capacitor so viewport-locking
            CSS in globals.css applies on iOS/Android but not on the web. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){document.documentElement.classList.add('native-app')}}catch(e){}})();`,
          }}
        />
        {/* Apply the persisted theme BEFORE first paint so dark-mode
            users never see a white flash. Reads the same zustand
            persist blob useTheme writes ('global-store'). Scoped to
            the /mobile app surfaces — marketing pages and the
            dashboard always render light. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(!location.pathname.startsWith('/mobile'))return;var t='system';var raw=localStorage.getItem('global-store');if(raw){var s=JSON.parse(raw);if(s&&s.state&&s.state.theme)t=s.state.theme}var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark)document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
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
            </CommandPaletteProvider>
          </LanguageWrapper>
        </AuthProvider>
      </body>
    </html>
  )
}