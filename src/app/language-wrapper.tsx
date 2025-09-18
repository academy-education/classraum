import { cookies } from 'next/headers'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { languageCookies } from '@/lib/cookies'

export async function LanguageWrapper({ children }: { children: React.ReactNode }) {
  // Get cookies on the server
  const cookieStore = await cookies()

  // Convert cookies to string format for parsing
  // Note: cookies() returns a ReadonlyRequestCookies object
  const allCookies = cookieStore.getAll()
  const cookieString = allCookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ')

  // Get the initial language from cookies on server-side
  const initialLanguage = languageCookies.getServerSide(cookieString)

  console.log('[LanguageWrapper] Server-side cookie string:', cookieString)
  console.log('[LanguageWrapper] Initial language from cookies:', initialLanguage)

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      {children}
    </LanguageProvider>
  )
}