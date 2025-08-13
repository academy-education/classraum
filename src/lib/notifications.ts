import { supabase } from '@/lib/supabase'

export interface NotificationParams {
  [key: string]: string | number | undefined
}

export interface NavigationData {
  page?: string
  filters?: {
    classroomId?: string
    sessionId?: string
    studentId?: string
  }
  action?: string
}

export interface CreateNotificationOptions {
  userId: string
  titleKey: string
  messageKey: string
  titleParams?: NotificationParams
  messageParams?: NotificationParams
  type: 'session' | 'attendance' | 'billing' | 'assignment' | 'alert' | 'system'
  navigationData?: NavigationData
  fallbackTitle?: string
  fallbackMessage?: string
}

/**
 * Creates a notification with multilingual support
 */
export async function createNotification(options: CreateNotificationOptions) {
  const {
    userId,
    titleKey,
    messageKey,
    titleParams = {},
    messageParams = {},
    type,
    navigationData,
    fallbackTitle = '',
    fallbackMessage = ''
  } = options

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title_key: titleKey,
        message_key: messageKey,
        title_params: titleParams,
        message_params: messageParams,
        title: fallbackTitle, // Fallback for legacy support
        message: fallbackMessage, // Fallback for legacy support
        type,
        navigation_data: navigationData,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error creating notification:', error)
    return { success: false, error }
  }
}

/**
 * Translates notification content using translation keys and parameters
 */
export function translateNotificationContent(
  titleKey: string,
  messageKey: string,
  titleParams: NotificationParams,
  messageParams: NotificationParams,
  translations: any,
  fallbackTitle?: string,
  fallbackMessage?: string,
  language?: string
): { title: string; message: string } {
  // If in English mode, convert Korean parameters
  const processedTitleParams = language === 'english' ? getEnglishFallback(titleParams) : titleParams
  const processedMessageParams = language === 'english' ? getEnglishFallback(messageParams) : messageParams

  // Get translated templates
  const titleTemplate = getNestedTranslation(translations, titleKey) || fallbackTitle || titleKey
  const messageTemplate = getNestedTranslation(translations, messageKey) || fallbackMessage || messageKey

  // Replace parameters in templates
  const title = replaceParams(titleTemplate, processedTitleParams)
  const message = replaceParams(messageTemplate, processedMessageParams)

  return { title, message }
}

/**
 * Gets a nested translation value using dot notation (e.g., "notifications.content.payment.success.title")
 */
function getNestedTranslation(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined
  }, obj)
}

/**
 * Helper function to detect if text contains Korean characters
 */
export function containsKorean(text: string): boolean {
  return /[\u3131-\uD79D]/ugi.test(text)
}

/**
 * Helper function to convert Korean date to English format
 */
export function convertKoreanDate(dateStr: string): string {
  // Handle Korean date format (e.g., "2024. 12. 20." or "12월 20일")
  if (dateStr.includes('년') || dateStr.includes('월') || dateStr.includes('일')) {
    // Extract numbers from Korean date
    const numbers = dateStr.match(/\d+/g)
    if (numbers) {
      if (numbers.length === 3) {
        // Full date: year, month, day
        const [year, month, day] = numbers
        return `${month}/${day}/${year}`
      } else if (numbers.length === 2) {
        // Month and day only
        const [month, day] = numbers
        const currentYear = new Date().getFullYear()
        return `${month}/${day}/${currentYear}`
      }
    }
  }
  
  // Handle date with dots (e.g., "2024. 12. 20.")
  if (dateStr.match(/\d{4}\.\s*\d{1,2}\.\s*\d{1,2}\.?/)) {
    const numbers = dateStr.match(/\d+/g)
    if (numbers && numbers.length === 3) {
      const [year, month, day] = numbers
      return `${month}/${day}/${year}`
    }
  }
  
  return dateStr
}

/**
 * Helper function to convert Korean time to English format
 */
export function convertKoreanTime(timeStr: string): string {
  let converted = timeStr
  
  // Handle "오전/오후 시간" format (e.g., "오후 3:00", "오전 9시")
  converted = converted.replace(/오전\s*(\d{1,2})시?\s*(\d{1,2})?분?/g, (match, hour, minute) => {
    const hr = parseInt(hour)
    const min = minute ? minute.padStart(2, '0') : '00'
    return `${hr}:${min} AM`
  })
  
  converted = converted.replace(/오후\s*(\d{1,2})시?\s*(\d{1,2})?분?/g, (match, hour, minute) => {
    const hr = parseInt(hour)
    const min = minute ? minute.padStart(2, '0') : '00'
    return `${hr}:${min} PM`
  })
  
  // Handle "3시 30분" format without 오전/오후
  converted = converted.replace(/(\d{1,2})시\s*(\d{1,2})?분?/g, (match, hour, minute) => {
    const hr = parseInt(hour)
    const min = minute ? minute.padStart(2, '0') : '00'
    const period = hr >= 12 ? 'PM' : 'AM'
    const displayHour = hr > 12 ? hr - 12 : (hr === 0 ? 12 : hr)
    return `${displayHour}:${min} ${period}`
  })
  
  // Clean up any remaining Korean time markers
  converted = converted.replace(/시/g, ':00')
  converted = converted.replace(/분/g, '')
  converted = converted.replace(/오전/g, 'AM')
  converted = converted.replace(/오후/g, 'PM')
  
  // Fix double colons or malformed times
  converted = converted.replace(/:00:(\d{2})/g, ':$1')
  converted = converted.replace(/\s+/g, ' ')
  
  return converted.trim()
}

/**
 * Helper function to convert Korean date/time terms to English while preserving actual content
 */
export function getEnglishFallback(params: NotificationParams): NotificationParams {
  const dateTimeTerms: { [key: string]: string } = {
    '내일': 'Tomorrow',
    '오늘': 'Today',
    '어제': 'Yesterday',
    '이번 주': 'this week',
    '다음 주': 'next week',
    '이번 달': 'this month',
    '다음 달': 'next month',
    '오전': 'AM',
    '오후': 'PM',
    '분 후': 'minutes',
    '시간 후': 'hours',
    '일 후': 'days',
    '주 후': 'weeks',
    '달 후': 'months'
  }

  const processedParams: NotificationParams = {}
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.trim()) {
      let processedValue = value
      
      // Handle relative time expressions like "15분 후" → "in 15 minutes"
      processedValue = processedValue.replace(/(\d+)분\s*후/g, 'in $1 minutes')
      processedValue = processedValue.replace(/(\d+)시간\s*후/g, 'in $1 hours')
      processedValue = processedValue.replace(/(\d+)일\s*후/g, 'in $1 days')
      processedValue = processedValue.replace(/(\d+)주\s*후/g, 'in $1 weeks')
      processedValue = processedValue.replace(/(\d+)달\s*후/g, 'in $1 months')
      
      // Replace common date/time terms
      for (const [korean, english] of Object.entries(dateTimeTerms)) {
        processedValue = processedValue.replace(new RegExp(korean, 'g'), english)
      }
      
      // Handle specific date formats
      if (key === 'date' || key === 'dueDate' || processedValue.includes('년') || processedValue.includes('월') || processedValue.includes('일') || processedValue.match(/\d{4}\.\s*\d{1,2}\.\s*\d{1,2}/)) {
        processedValue = convertKoreanDate(processedValue)
      }
      
      // Handle specific time formats
      if (key === 'time' || key === 'startTime' || key === 'endTime' || key === 'oldTime' || key === 'newTime' || processedValue.includes('시') || processedValue.includes('분')) {
        processedValue = convertKoreanTime(processedValue)
      }
      
      // Only use converted value if it actually changed (meaning it had date/time info)
      // Otherwise, preserve the original Korean content (names, subjects, etc.)
      if (processedValue !== value && 
          (processedValue.includes('Tomorrow') || processedValue.includes('Today') || processedValue.includes('Yesterday') ||
           processedValue.includes('AM') || processedValue.includes('PM') || processedValue.includes('in ') ||
           processedValue.match(/\d{1,2}\/\d{1,2}\/\d{4}/) || processedValue.match(/\d{1,2}:\d{2}/))) {
        processedParams[key] = processedValue
      } else {
        processedParams[key] = value
      }
    } else {
      processedParams[key] = value
    }
  }
  
  return processedParams
}

/**
 * Replaces parameters in a template string
 */
function replaceParams(template: string, params: NotificationParams): string {
  if (!template || typeof template !== 'string') return template

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key]
    return value !== undefined ? String(value) : match
  })
}

/**
 * Convenience functions for common notification types
 */

// Payment notifications
export async function createPaymentNotification(
  userId: string,
  type: 'success' | 'failed' | 'reminder' | 'overdue',
  params: { student: string; amount?: string; dueDate?: string },
  navigationData?: NavigationData
) {
  return createNotification({
    userId,
    titleKey: `notifications.content.payment.${type}.title`,
    messageKey: `notifications.content.payment.${type}.message`,
    titleParams: params,
    messageParams: params,
    type: 'billing',
    navigationData,
    fallbackTitle: `Payment ${type}`,
    fallbackMessage: `Payment notification for ${params.student}`
  })
}

// Session notifications
export async function createSessionNotification(
  userId: string,
  type: 'reminder' | 'cancelled' | 'rescheduled' | 'completed',
  params: { classroom: string; time?: string; date?: string; oldTime?: string; newTime?: string },
  navigationData?: NavigationData
) {
  return createNotification({
    userId,
    titleKey: `notifications.content.session.${type}.title`,
    messageKey: `notifications.content.session.${type}.message`,
    titleParams: params,
    messageParams: params,
    type: 'session',
    navigationData,
    fallbackTitle: `Session ${type}`,
    fallbackMessage: `Session notification for ${params.classroom}`
  })
}

// Attendance notifications
export async function createAttendanceNotification(
  userId: string,
  type: 'marked' | 'absent' | 'late',
  params: { student: string; classroom: string; status?: string; date?: string },
  navigationData?: NavigationData
) {
  return createNotification({
    userId,
    titleKey: `notifications.content.attendance.${type}.title`,
    messageKey: `notifications.content.attendance.${type}.message`,
    titleParams: params,
    messageParams: params,
    type: 'attendance',
    navigationData,
    fallbackTitle: `Attendance ${type}`,
    fallbackMessage: `Attendance notification for ${params.student}`
  })
}

// Assignment notifications
export async function createAssignmentNotification(
  userId: string,
  type: 'new' | 'submitted' | 'graded' | 'due' | 'overdue',
  params: { title: string; student?: string; classroom?: string; dueDate?: string; score?: string },
  navigationData?: NavigationData
) {
  return createNotification({
    userId,
    titleKey: `notifications.content.assignment.${type}.title`,
    messageKey: `notifications.content.assignment.${type}.message`,
    titleParams: params,
    messageParams: params,
    type: 'assignment',
    navigationData,
    fallbackTitle: `Assignment ${type}`,
    fallbackMessage: `Assignment notification: ${params.title}`
  })
}

// Student notifications
export async function createStudentNotification(
  userId: string,
  type: 'enrolled' | 'withdrawn',
  params: { student: string; classroom: string },
  navigationData?: NavigationData
) {
  return createNotification({
    userId,
    titleKey: `notifications.content.student.${type}.title`,
    messageKey: `notifications.content.student.${type}.message`,
    titleParams: params,
    messageParams: params,
    type: 'alert',
    navigationData,
    fallbackTitle: `Student ${type}`,
    fallbackMessage: `Student notification for ${params.student}`
  })
}

// System notifications
export async function createSystemNotification(
  userId: string,
  type: 'welcome' | 'update' | 'maintenance',
  params: { date?: string; startTime?: string; endTime?: string } = {},
  navigationData?: NavigationData
) {
  return createNotification({
    userId,
    titleKey: `notifications.content.system.${type}.title`,
    messageKey: `notifications.content.system.${type}.message`,
    titleParams: params,
    messageParams: params,
    type: 'system',
    navigationData,
    fallbackTitle: `System ${type}`,
    fallbackMessage: `System notification`
  })
}

/**
 * Bulk notification creation for multiple users
 */
export async function createBulkNotifications(
  userIds: string[],
  options: Omit<CreateNotificationOptions, 'userId'>
) {
  const notifications = userIds.map(userId => ({
    user_id: userId,
    title_key: options.titleKey,
    message_key: options.messageKey,
    title_params: options.titleParams || {},
    message_params: options.messageParams || {},
    title: options.fallbackTitle || '',
    message: options.fallbackMessage || '',
    type: options.type,
    navigation_data: options.navigationData,
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }))

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error creating bulk notifications:', error)
    return { success: false, error }
  }
}