import type { Metadata } from 'next'
import { Montserrat, Noto_Sans_KR } from 'next/font/google'
import { cookies } from 'next/headers'
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read language from server-side cookies to prevent hydration mismatches
  let initialLanguage: SupportedLanguage
  try {
    const cookieStore = await cookies()
    // Get the specific language cookie instead of converting all cookies to string
    const languageCookie = cookieStore.get('classraum_language')
    const cookieValue = languageCookie?.value

    if (cookieValue && (cookieValue === 'english' || cookieValue === 'korean')) {
      initialLanguage = cookieValue
    } else {
      initialLanguage = 'korean'
    }
  } catch {
    // Fallback to safe default if cookie reading fails
    initialLanguage = 'korean'
  }

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