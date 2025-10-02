# Push Notification System

This document describes the comprehensive push notification system implemented for Classraum.

## Overview

The notification system has been upgraded from a "pull" model (where notifications are generated when users visit the notifications page) to a proper "push" model where notifications are created immediately when events occur.

## Features

### Notification Triggers

The system automatically sends notifications for the following events:

1. **Assignment Creation** - When teachers create new assignments
   - Recipients: Students in the classroom + their family members
   - Trigger: `useAssignmentActions.createAssignment()`

2. **Attendance Changes** - When attendance status changes from "pending" to any other value
   - Recipients: Student + their family members
   - Trigger: Manual integration needed in attendance update functions

3. **Invoice Creation** - When new invoices are generated
   - Recipients: Student + their family members
   - Trigger: Manual integration needed in invoice creation functions

4. **Invoice Payment** - When invoices are marked as paid
   - Recipients: Academy managers
   - Trigger: Manual integration needed in payment processing functions

5. **Student Report Completion** - When student reports are marked as "Finished"
   - Recipients: Student + their family members
   - Trigger: Manual integration needed in report completion functions

6. **User Deactivation** - When users are deactivated
   - Recipients: The deactivated user
   - Trigger: Manual integration needed in user management functions

7. **Session Auto-Completion** - When sessions pass their end time and are still "scheduled"
   - Recipients: Teachers + academy managers
   - Trigger: Automated via cron job (`/api/cron/session-completion`)

8. **Classroom Creation** - When new classrooms are created
   - Recipients: Academy managers + assigned teacher
   - Trigger: Manual integration needed in classroom creation functions

9. **Session Creation** - When new sessions are created
   - Recipients: Academy managers + teacher + substitute teacher (if any)
   - Trigger: Manual integration needed in session creation functions

10. **Welcome Notifications** - When new users sign up
    - Recipients: The new user
    - Trigger: Manual integration needed in user registration functions

## Architecture

### Core Files

- `src/lib/notification-triggers.ts` - Core trigger functions for each event type
- `src/lib/notifications.ts` - Existing notification library (enhanced for push notifications)
- `src/app/api/notifications/triggers/route.ts` - API endpoint for triggering notifications
- `src/app/api/cron/session-completion/route.ts` - Scheduled job for session auto-completion
- `src/app/api/test-notifications/route.ts` - Testing endpoint for all notification types

### Translation Files

Notification messages support both English and Korean:
- `src/locales/en.json` - English translations under `notifications.content.*`
- `src/locales/ko.json` - Korean translations under `notifications.content.*`

## Usage

### Integration Example

To integrate notifications into your data creation/update functions:

```typescript
import { triggerAssignmentCreatedNotifications } from '@/lib/notification-triggers'

// After successfully creating an assignment
const { data, error } = await supabase
  .from('assignments')
  .insert(assignmentData)
  .select()
  .single()

if (!error) {
  // Trigger notifications (don't fail the main operation if this fails)
  try {
    await triggerAssignmentCreatedNotifications(data.id)
  } catch (notificationError) {
    console.error('Notification error:', notificationError)
  }
}
```

### API Usage

You can also trigger notifications via the API:

```typescript
// POST /api/notifications/triggers
{
  "trigger": "assignment_created",
  "data": {
    "assignmentId": "uuid-here"
  }
}
```

### Testing

Use the test endpoint to verify notifications work:

```typescript
// POST /api/test-notifications
{
  "trigger": "welcome",
  "testData": {
    "userId": "user-uuid"
  }
}
```

## Scheduled Jobs

### Session Auto-Completion

- **Endpoint**: `/api/cron/session-completion`
- **Schedule**: Should be run every hour via cron
- **Function**: Automatically marks sessions as "completed" when they pass their end time
- **Authentication**: Requires `CRON_SECRET_KEY` environment variable

#### Vercel Cron Setup

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/session-completion",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Translation Keys

All notification messages use translation keys for multilingual support:

- `notifications.content.assignment.new.title/message`
- `notifications.content.attendance.changed.title/message`
- `notifications.content.payment.new_invoice.title/message`
- `notifications.content.payment.paid.title/message`
- `notifications.content.report.completed.title/message`
- `notifications.content.account.deactivated.title/message`
- `notifications.content.session.auto_completed.title/message`
- `notifications.content.session.created.title/message`
- `notifications.content.classroom.created.title/message`
- `notifications.content.system.welcome.title/message`

## Database Schema

The system uses the existing `notifications` table with these fields:
- `user_id` - Recipient of the notification
- `title_key` - Translation key for title
- `message_key` - Translation key for message
- `title_params` - Parameters for title translation
- `message_params` - Parameters for message translation
- `type` - Notification type (assignment, attendance, billing, etc.)
- `navigation_data` - Data for app navigation when notification is clicked

## Family-Aware Notifications

For student-related events (assignments, attendance, invoices, reports), the system automatically:
1. Identifies the student's family using the `family_members` table
2. Sends notifications to all family members (both students and parents)
3. Falls back to just the student if no family is found

## Error Handling

- Notification failures don't break the main business operations
- Errors are logged but don't propagate to the UI
- Fallback mechanisms ensure notifications reach at least the primary user

## Next Steps

### Remaining Integrations Needed

The following functions still need notification integration:

1. **Attendance Updates** - Find where attendance status is changed
2. **Invoice Creation** - Find where invoices are created
3. **Invoice Payment** - Find where invoice status is updated to "paid"
4. **Report Completion** - Find where student_reports.status is set to "Finished"
5. **User Deactivation** - Find where user.active is set to false
6. **Classroom Creation** - Find where new classrooms are created
7. **Session Creation** - Find where new classroom_sessions are created
8. **User Registration** - Find where new users are created

### Performance Considerations

- Use bulk notification creation when possible
- Consider queueing system for high-volume notifications
- Monitor notification delivery success rates
- Implement retry mechanisms for failed notifications

This notification system provides a solid foundation for real-time user engagement and can be extended with additional triggers as needed.