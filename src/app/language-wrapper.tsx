import { LanguageProvider } from '@/contexts/LanguageContext'
import { SupportedLanguage } from '@/locales'

export function LanguageWrapper({ children }: { children: React.ReactNode }) {
  // For static generation and server-side rendering, always use the default language
  // The actual language will be determined on the client-side after hydration
  const initialLanguage: SupportedLanguage = 'korean' // Safe default for SSR/SSG

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      {children}
    </LanguageProvider>
  )
}