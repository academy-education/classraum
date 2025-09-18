import { cookies } from 'next/headers'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { languageCookies } from '@/lib/cookies'
import { SupportedLanguage } from '@/locales'

export async function LanguageWrapper({ children }: { children: React.ReactNode }) {
  // Get cookies on the server with error handling for serverless environments
  let cookieString = ''
  let initialLanguage: SupportedLanguage = 'korean' // Default fallback

  try {
    const cookieStore = await cookies()

    // Convert cookies to string format for parsing
    // Note: cookies() returns a ReadonlyRequestCookies object
    const allCookies = cookieStore.getAll()
    cookieString = allCookies
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ')

    // Get the initial language from cookies on server-side
    initialLanguage = languageCookies.getServerSide(cookieString)
  } catch {
    // Fallback when cookies() is not available (e.g., during static generation)
    // This prevents 500 errors in serverless environments
    initialLanguage = 'korean'
  }

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      {children}
    </LanguageProvider>
  )
}