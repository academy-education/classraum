import enTranslations from './en.json'
import koTranslations from './ko.json'

export type SupportedLanguage = 'english' | 'korean'

export const languages = {
  english: enTranslations,
  korean: koTranslations
} as const

export const languageNames = {
  english: 'English',
  korean: '한국어'
} as const

export type TranslationKey = keyof typeof enTranslations
export type TranslationValue = typeof enTranslations

export function getNestedValue(obj: Record<string, unknown>, path: string): string | string[] {
  const keys = path.split('.')
  const result = keys.reduce((current: unknown, key) => {
    const next = (current as Record<string, unknown>)?.[key]
    return next
  }, obj as unknown)

  // If the result is a string, return it
  if (typeof result === 'string') {
    return result
  }

  // Pass arrays through. Some translation arrays hold strings (weekday
  // labels), others hold objects ({ title, description } cards). Both
  // need to reach callers; the typed return is a slight lie but tList()
  // re-widens to unknown[] for callers that need the object shape.
  if (Array.isArray(result)) {
    return result as string[]
  }

  // For other types (objects, etc.), return the path as fallback
  return path
}