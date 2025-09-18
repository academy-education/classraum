import { LanguageProvider } from '@/contexts/LanguageContext'
import { SupportedLanguage } from '@/locales'

interface LanguageWrapperProps {
  children: React.ReactNode
  initialLanguage?: SupportedLanguage
}

export function LanguageWrapper({ children, initialLanguage }: LanguageWrapperProps) {
  // Use provided initial language or fall back to safe default
  // This allows the root layout to pass server-side cookie values
  const safeInitialLanguage: SupportedLanguage = initialLanguage || 'korean'

  return (
    <LanguageProvider initialLanguage={safeInitialLanguage}>
      {children}
    </LanguageProvider>
  )
}