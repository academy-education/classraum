/**
 * Format date in local timezone without timezone shifts
 * This ensures dates remain consistent regardless of user's timezone
 *
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format using local timezone
 */
export const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get today's date in local timezone
 * This avoids UTC conversion issues that can cause off-by-one day errors
 *
 * @returns Today's date string in YYYY-MM-DD format
 */
export const getTodayLocal = (): string => {
  return formatDateLocal(new Date())
}

/**
 * Get date N days from now in local timezone
 *
 * @param days - Number of days to add (can be negative for past dates)
 * @returns Date string in YYYY-MM-DD format
 */
export const getDateOffsetLocal = (days: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return formatDateLocal(date)
}

/**
 * Get the BCP-47 locale tag for the app language.
 * Used as the first argument to Intl APIs (toLocaleDateString, toLocaleString, etc.).
 */
export const getDateLocale = (language: string | undefined | null): string => {
  return language === 'korean' ? 'ko-KR' : 'en-US'
}

/**
 * Short single/double-character weekday labels (Sun-first), localized.
 * English: S M T W T F S
 * Korean:  일 월 화 수 목 금 토
 */
export const getWeekdayShort = (language: string | undefined | null): string[] => {
  return language === 'korean'
    ? ['일', '월', '화', '수', '목', '금', '토']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S']
}

/**
 * Short month labels (Jan-first), localized.
 */
export const getMonthShort = (language: string | undefined | null): string[] => {
  return language === 'korean'
    ? ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
}

/**
 * Full weekday labels keyed by lowercase English day name.
 * Used by classrooms-page for the recurring-schedule UI.
 */
export const getWeekdayFullMap = (language: string | undefined | null): Record<string, string> => {
  return language === 'korean'
    ? { monday: '월요일', tuesday: '화요일', wednesday: '수요일', thursday: '목요일', friday: '금요일', saturday: '토요일', sunday: '일요일' }
    : { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' }
}

/**
 * Map of weekday index (0 = Sunday) to short label, localized.
 * Used by payments-page recurring schedule pickers.
 */
export const getWeekdayShortMap = (language: string | undefined | null): Record<number, string> => {
  const arr = getWeekdayShort(language)
  return { 0: arr[0], 1: arr[1], 2: arr[2], 3: arr[3], 4: arr[4], 5: arr[5], 6: arr[6] }
}
