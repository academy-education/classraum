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
  fallbackMessage?: string
): { title: string; message: string } {
  // Get translated templates
  const titleTemplate = getNestedTranslation(translations, titleKey) || fallbackTitle || titleKey
  const messageTemplate = getNestedTranslation(translations, messageKey) || fallbackMessage || messageKey

  // Replace parameters in templates
  const title = replaceParams(titleTemplate, titleParams)
  const message = replaceParams(messageTemplate, messageParams)

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