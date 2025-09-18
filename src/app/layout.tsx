import type { Metadata } from 'next'
import { Montserrat, Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import { LanguageWrapper } from './language-wrapper'
import { CommandPaletteProvider } from '@/contexts/CommandPaletteContext'
import { SupportedLanguage } from '@/locales'

const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: '--font-montserrat',
})

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-noto-sans-kr',
})

export const metadata: Metadata = {
  title: 'Classraum - Academy Management Platform',
  description: 'A comprehensive academy management platform for teachers, students, and parents.',
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
      <body
        className={`${montserrat.variable} ${notoSansKR.variable} ${montserrat.className}`}
        suppressHydrationWarning
      >
        <LanguageWrapper initialLanguage={initialLanguage}>
          <CommandPaletteProvider>
            {children}
          </CommandPaletteProvider>
        </LanguageWrapper>
      </body>
    </html>
  )
}