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

export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const result = path.split('.').reduce((current: unknown, key) => (current as Record<string, unknown>)?.[key], obj as unknown)
  
  // If the result is a string, return it. If it's not a string (including objects), return the path as fallback
  if (typeof result === 'string') {
    return result
  }
  
  return path
}