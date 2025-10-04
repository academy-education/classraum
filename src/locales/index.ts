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
    //console.log('[getNestedValue] Traversing:', { key, currentType: typeof current, nextType: typeof next, nextValue: next })
    return next
  }, obj as unknown)

  //console.log('[getNestedValue] Final result:', { path, result, resultType: typeof result })

  // If the result is a string, return it
  if (typeof result === 'string') {
    return result
  }

  // If the result is an array of strings, return it
  if (Array.isArray(result) && result.every(item => typeof item === 'string')) {
    return result as string[]
  }

  // For other types (objects, etc.), return the path as fallback
  //console.error('[getNestedValue] Failed to find translation for path:', path, 'result:', result)
  return path
}