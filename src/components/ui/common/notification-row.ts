import type { Json } from '@/lib/database.types'
import type { NotificationParams, NavigationData } from '@/lib/notifications'

/**
 * The shape the notification UI works with, derived from a `notifications` row.
 *
 * Three of that table's columns are jsonb (`title_params`, `message_params`,
 * `navigation_data`), so the generated types can only describe them as `Json`.
 * `parseNotificationRow` validates them at runtime instead of asserting a shape
 * the database does not enforce — a malformed blob degrades to "absent" rather
 * than reaching the renderer as an impossible value.
 */
export interface NotificationRow {
  id: string
  user_id: string
  title: string
  message: string
  title_key?: string | null
  message_key?: string | null
  title_params?: NotificationParams
  message_params?: NotificationParams
  type: string
  /** notifications.is_read is nullable; treat "never set" as unread. */
  is_read: boolean
  navigation_data?: NavigationData
  created_at: string | null
  updated_at: string | null
}

/** The raw columns this parser needs; a superset of `select('*')` is fine. */
interface RawNotification {
  id: string
  user_id: string
  title: string
  message: string
  title_key: string | null
  message_key: string | null
  title_params: Json
  message_params: Json
  type: string
  is_read: boolean | null
  navigation_data: Json
  created_at: string | null
  updated_at: string | null
}

function asRecord(value: Json): Record<string, Json | undefined> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null
}

function asString(value: Json | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function parseParams(value: Json): NotificationParams | undefined {
  const record = asRecord(value)
  if (!record) return undefined
  const params: NotificationParams = {}
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === 'string' || typeof entry === 'number') {
      params[key] = entry
    }
  }
  return params
}

function parseNavigationData(value: Json): NavigationData | undefined {
  const record = asRecord(value)
  if (!record) return undefined
  const filtersRecord = record.filters === undefined ? null : asRecord(record.filters)
  return {
    page: asString(record.page),
    action: asString(record.action),
    filters: filtersRecord
      ? {
          classroomId: asString(filtersRecord.classroomId),
          sessionId: asString(filtersRecord.sessionId),
          studentId: asString(filtersRecord.studentId),
          invoiceId: asString(filtersRecord.invoiceId),
          reportId: asString(filtersRecord.reportId),
          status: asString(filtersRecord.status),
          assignmentId: asString(filtersRecord.assignmentId),
        }
      : undefined,
  }
}

export function parseNotificationRow(row: RawNotification): NotificationRow {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    message: row.message,
    title_key: row.title_key,
    message_key: row.message_key,
    title_params: parseParams(row.title_params),
    message_params: parseParams(row.message_params),
    type: row.type,
    // is_read is nullable — a row that was never marked is unread.
    is_read: row.is_read ?? false,
    navigation_data: parseNavigationData(row.navigation_data),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
