import { cookies } from 'next/headers'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { languageCookies } from '@/lib/cookies'
import { ReactNode } from 'react'

interface LanguageProviderWrapperProps {
  children: ReactNode
}

export async function LanguageProviderWrapper({ children }: LanguageProviderWrapperProps) {
  // Read language from server-side cookies
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const initialLanguage = languageCookies.getServerSide(cookieHeader)

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      {children}
    </LanguageProvider>
  )
}