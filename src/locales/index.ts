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

export function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path
}