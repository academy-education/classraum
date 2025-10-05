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
