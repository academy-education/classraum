import type { Metadata, Viewport } from 'next'
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
  // Use default language for SSR to prevent Vercel serverless issues
  // Client-side will handle cookie reading and update after hydration
  const initialLanguage: SupportedLanguage = 'korean'

  return (
    <html lang="en">
      <head>
        {/* Explicit viewport meta for Capacitor/iOS WebView - ensures safe-area-inset-* CSS env variables work */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
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