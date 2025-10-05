# Progressive Web App (PWA) Implementation Plan for /mobile Pages

## Overview
Convert the existing `/mobile` routes into a fully functional Progressive Web App that can be installed on iOS and Android devices, providing an app-like experience for students and parents with push notification support.

## Analysis Summary

**Current State:**
- Mobile-optimized Next.js 15 App Router pages
- Role-based routing (students/parents)
- Responsive UI with bottom navigation
- Pull-to-refresh functionality
- Real-time data syncing with Supabase
- Multi-language support (English/Korean)

**Technology Stack:**
- Next.js 15 with App Router ✓
- React 19 ✓
- Tailwind CSS 4 ✓
- Supabase backend ✓

## Implementation Plan

### Phase 1: PWA Foundation Setup

#### 1.1 Install Dependencies
```bash
npm install -D @serwist/next serwist
npm install web-push
```

#### 1.2 Create Web App Manifest
**File:** `src/app/manifest.ts`

Create a dynamic manifest file with:
- App name and short name (English + Korean)
- App description
- Start URL (`/mobile`)
- Display mode: `standalone`
- Theme colors matching existing design
- Background color
- Icon configurations (multiple sizes)
- Orientation: `portrait`
- Categories: `['education', 'productivity']`
- Language support

#### 1.3 Generate App Icons
Create icon set in `/public/icons/`:
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `apple-touch-icon.png` (180x180 for iOS)
- Maskable icon variants for adaptive icons
- Notification icon (monochrome, 96x96)

**Source:** Use existing `/public/logo.png` as base

### Phase 2: Service Worker Configuration

#### 2.1 Configure Serwist Plugin
**File:** `next.config.ts`

Add `@serwist/next` plugin configuration:
- Source file: `src/app/sw.ts`
- Destination: `public/sw.js`
- Disable in development
- Configure caching strategies:
  - Network-first for API routes
  - Cache-first for static assets
  - StaleWhileRevalidate for pages

#### 2.2 Create Service Worker
**File:** `src/app/sw.ts`

Implement service worker with:
- Precaching for critical assets
- Runtime caching strategies
- Background sync for offline actions
- Cache management (size limits, expiration)
- Skip waiting and clients claim
- **Push notification event handlers**
- **Notification click handlers**

#### 2.3 Register Service Worker
**File:** `src/app/mobile/layout.tsx`

Add service worker registration logic:
- Client-side only execution
- Production environment check
- Registration error handling
- Update notification mechanism

### Phase 3: Push Notifications Implementation

#### 3.1 Backend Setup - VAPID Keys
**File:** `scripts/generate-vapid-keys.js` (new)

Create script to generate VAPID keys for web push:
```javascript
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

**Environment Variables:**
Add to `.env.local` and Vercel:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL` (contact email for push service)

#### 3.2 Notification Permission Hook
**File:** `src/hooks/useNotificationPermission.ts` (new)

Create hook to manage notification permissions:
- Check current permission state
- Request permission from user
- Handle permission changes
- iOS-specific handling (16.4+ only)
- Return permission status and request function

#### 3.3 Push Subscription Management
**File:** `src/hooks/usePushSubscription.ts` (new)

Create hook to manage push subscriptions:
- Subscribe to push notifications
- Unsubscribe from notifications
- Get current subscription
- Send subscription to backend
- Handle subscription errors

#### 3.4 Push Subscription API
**File:** `src/app/api/notifications/subscribe/route.ts` (new)

API endpoint to save push subscriptions:
- Validate request body
- Extract subscription details
- Get authenticated user
- Store subscription in Supabase `push_subscriptions` table:
  - `id` (uuid)
  - `user_id` (uuid, foreign key)
  - `endpoint` (text)
  - `p256dh_key` (text)
  - `auth_key` (text)
  - `user_agent` (text)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- Handle duplicate subscriptions

**File:** `src/app/api/notifications/unsubscribe/route.ts` (new)

API endpoint to remove push subscriptions:
- Get authenticated user
- Delete subscription from database
- Return success response

#### 3.5 Database Schema
Create Supabase migration for push subscriptions:
```sql
create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  p256dh_key text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, endpoint)
);

-- Enable RLS
alter table push_subscriptions enable row level security;

-- Policy: Users can only manage their own subscriptions
create policy "Users can manage own subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id);

-- Index for faster lookups
create index push_subscriptions_user_id_idx on push_subscriptions(user_id);
```

#### 3.6 Send Notification API
**File:** `src/app/api/notifications/send/route.ts` (new)

API endpoint to send push notifications:
- Authenticate request (server-side only)
- Validate notification payload
- Fetch user's subscriptions from database
- Use `web-push` library to send notifications
- Handle sending to multiple subscriptions
- Remove invalid/expired subscriptions
- Return delivery status

**Payload structure:**
```typescript
{
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: {
    url?: string
    action?: string
    [key: string]: any
  }
}
```

#### 3.7 Notification Utility Functions
**File:** `src/lib/notifications.ts` (new)

Create utility functions:
- `sendNotificationToUser(userId, payload)` - Send to specific user
- `sendNotificationToRole(role, payload)` - Send to all users with role
- `sendNotificationToClassroom(classroomId, payload)` - Send to classroom members
- `scheduleNotification(userId, payload, scheduledTime)` - Schedule future notification

#### 3.8 Notification UI Component
**File:** `src/components/ui/mobile/NotificationSettings.tsx` (new)

Create settings component:
- Toggle to enable/disable notifications
- Show current permission status
- Request permission button
- iOS-specific instructions
- Test notification button
- Notification preferences (assignment reminders, session reminders, grades, invoices)

#### 3.9 Service Worker Notification Handlers
**File:** `src/app/sw.ts` (update)

Add event handlers:
```typescript
// Handle push event
self.addEventListener('push', (event) => {
  const data = event.data?.json()
  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/notification-badge.png',
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/mobile'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})
```

#### 3.10 Integration with Existing Features

**Assignments:**
Send notifications when:
- New assignment created
- Assignment due date approaching (24h, 1h before)
- Grade posted for assignment

**Sessions:**
Send notifications when:
- Session starting soon (30min, 10min before)
- Session cancelled
- Attendance marked

**Invoices:**
Send notifications when:
- New invoice created
- Payment due soon
- Payment received
- Invoice overdue

**General:**
- Important announcements from teachers
- Schedule changes
- Messages from teachers

#### 3.11 Notification Triggers
**File:** `src/app/api/cron/send-notifications/route.ts` (new)

Create cron job for scheduled notifications:
- Check for upcoming sessions (30min, 10min)
- Check for assignment due dates (24h, 1h)
- Check for overdue invoices
- Send appropriate notifications

Update `vercel.json` to add cron schedule:
```json
{
  "path": "/api/cron/send-notifications",
  "schedule": "*/15 * * * *"  // Every 15 minutes
}
```

### Phase 4: PWA Optimizations

#### 4.1 Offline Support
- Cache critical pages (`/mobile`, `/mobile/schedule`, `/mobile/assignments`)
- Implement offline fallback page
- Queue failed requests for background sync
- Show offline indicator in UI

#### 4.2 Add to Home Screen Prompt
**File:** `src/components/ui/mobile/InstallPrompt.tsx` (new)

Create install banner component:
- Detect if app is installable
- Show dismissible install prompt
- Handle `beforeinstallprompt` event
- iOS-specific instructions (Share > Add to Home Screen)
- Store user preference in localStorage
- **Prompt for notification permission after install**

#### 4.3 Update Metadata
**File:** `src/app/layout.tsx`

Add PWA-specific meta tags:
- `theme-color` (dynamic based on route)
- `apple-mobile-web-app-capable`
- `apple-mobile-web-app-status-bar-style`
- `mobile-web-app-capable`
- Viewport configuration for mobile

### Phase 5: iOS-Specific Enhancements

#### 5.1 iOS Meta Tags
Add iOS-specific configurations:
- Splash screens for different device sizes
- Status bar styling
- Safe area handling
- Disable auto-zoom on inputs

#### 5.2 iOS Notification Support
**Important limitations:**
- Web Push supported on iOS 16.4+ (Safari only)
- Only works when PWA is installed to home screen
- No support for notification badges on iOS
- Limited notification actions

**Implementation:**
- Detect iOS version
- Show appropriate messaging
- Require app installation before notification permission
- Provide fallback for older iOS versions

#### 5.3 Create Splash Screens
Generate splash screen images for:
- iPhone SE, 8
- iPhone X, XS, 11 Pro
- iPhone XR, 11
- iPhone 12, 13, 14, 15
- iPad (various sizes)

#### 5.4 iOS Compatibility Testing
- Test gesture navigation
- Verify pull-to-refresh behavior
- Check keyboard behavior
- Validate safe area insets
- **Test notifications on iOS 16.4+**

### Phase 6: Android-Specific Enhancements

#### 6.1 Maskable Icons
- Create maskable icon variants
- Update manifest with `purpose: "maskable any"`
- Test on various Android launchers

#### 6.2 Notification Features
- Rich notifications with actions
- Notification badges
- Notification channels/categories
- Custom notification sounds (optional)

#### 6.3 Shortcuts
**Update:** `src/app/manifest.ts`

Add app shortcuts:
- Schedule view
- Assignments list
- Notifications
- Profile

#### 6.4 Android Features
- Theme color for address bar
- Notification icons
- Badge support for notifications

### Phase 7: Performance & UX Improvements

#### 7.1 Loading States
- Implement skeleton screens (already exists ✓)
- Add progressive loading for images
- Optimize initial bundle size
- Code splitting for routes

#### 7.2 Background Sync
Implement background sync for:
- Attendance submissions
- Assignment uploads
- Profile updates
- Failed notification deliveries

#### 7.3 Notification Preferences
**File:** `src/app/mobile/settings/notifications/page.tsx` (new)

Create notification settings page:
- Enable/disable notifications globally
- Per-category toggles (assignments, sessions, grades, invoices)
- Quiet hours configuration
- Notification sound preferences (Android)
- Save preferences to database

### Phase 8: Testing & Validation

#### 8.1 PWA Audit
- Run Lighthouse PWA audit
- Ensure score > 90
- Fix any PWA checklist failures

#### 8.2 Notification Testing
Test on:
- iOS Safari 16.4+ (installed PWA)
- Chrome Android
- Samsung Internet
- Various screen sizes

Test scenarios:
- Permission request flow
- Receiving notifications (app open)
- Receiving notifications (app closed)
- Notification clicks
- Unsubscribe flow
- Multiple devices per user

#### 8.3 Device Testing
Test on:
- iOS Safari (16.4+)
- Chrome Android
- Samsung Internet
- Various screen sizes

#### 8.4 Offline Testing
- Test offline functionality
- Verify cache strategies
- Check background sync
- Validate error handling

### Phase 9: Documentation & Deployment

#### 9.1 User Documentation
Create guide for:
- How to install PWA on iOS
- How to install PWA on Android
- How to enable notifications
- Offline features explanation
- Troubleshooting

#### 9.2 Update Vercel Configuration
**File:** `vercel.json`
- Ensure proper headers for service worker
- Add cache-control headers
- Configure redirects if needed
- Add notification cron job

#### 9.3 Environment Variables
Document required environment variables:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_EMAIL`

#### 9.4 Analytics
Add tracking for:
- PWA install events
- Notification permission grants/denials
- Notification deliveries
- Notification clicks
- Offline usage
- Service worker performance
- User engagement metrics

## File Structure
```
classraum/
├── public/
│   ├── icons/
│   │   ├── icon-*.png (multiple sizes)
│   │   ├── apple-touch-icon.png
│   │   ├── maskable-icon-*.png
│   │   └── notification-badge.png (new)
│   ├── splash/
│   │   └── (iOS splash screens)
│   └── sw.js (generated)
├── scripts/
│   └── generate-vapid-keys.js (new)
├── src/
│   ├── app/
│   │   ├── manifest.ts (new)
│   │   ├── sw.ts (new)
│   │   ├── layout.tsx (update metadata)
│   │   ├── api/
│   │   │   ├── notifications/
│   │   │   │   ├── subscribe/route.ts (new)
│   │   │   │   ├── unsubscribe/route.ts (new)
│   │   │   │   └── send/route.ts (new)
│   │   │   └── cron/
│   │   │       └── send-notifications/route.ts (new)
│   │   └── mobile/
│   │       ├── layout.tsx (register SW)
│   │       ├── settings/
│   │       │   └── notifications/page.tsx (new)
│   │       └── components/
│   │           └── InstallPrompt.tsx (new)
│   ├── components/
│   │   └── ui/
│   │       └── mobile/
│   │           └── NotificationSettings.tsx (new)
│   ├── hooks/
│   │   ├── useNotificationPermission.ts (new)
│   │   └── usePushSubscription.ts (new)
│   └── lib/
│       └── notifications.ts (new)
├── supabase/
│   └── migrations/
│       └── YYYYMMDDHHMMSS_create_push_subscriptions.sql (new)
├── next.config.ts (update with Serwist)
├── package.json (add dependencies)
└── .env.local (add VAPID keys)
```

## Database Schema
```sql
-- Push Subscriptions Table
push_subscriptions (
  id uuid primary key,
  user_id uuid references auth.users(id),
  endpoint text,
  p256dh_key text,
  auth_key text,
  user_agent text,
  created_at timestamp,
  updated_at timestamp
)

-- Notification Preferences Table (optional)
notification_preferences (
  id uuid primary key,
  user_id uuid references auth.users(id),
  assignments_enabled boolean default true,
  sessions_enabled boolean default true,
  grades_enabled boolean default true,
  invoices_enabled boolean default true,
  announcements_enabled boolean default true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamp,
  updated_at timestamp
)
```

## Success Criteria
- [ ] PWA installable on iOS (16.4+) and Android
- [ ] Lighthouse PWA score > 90
- [ ] Works offline with cached content
- [ ] Fast load times (< 2s on 3G)
- [ ] Home screen icon displays correctly
- [ ] Splash screen shows on launch
- [ ] App runs in standalone mode
- [ ] Service worker updates properly
- [ ] Background sync functional
- [ ] **Push notifications working on iOS 16.4+ and Android**
- [ ] **Notification permission flow smooth and intuitive**
- [ ] **Notifications delivered reliably**
- [ ] **Notification clicks navigate to correct pages**
- [ ] Cross-platform compatibility verified

## Push Notification Use Cases

### 1. Assignment Reminders
- **24 hours before due date:** "Assignment due tomorrow: [title]"
- **1 hour before due date:** "Last chance! Assignment due in 1 hour: [title]"
- **New assignment posted:** "New assignment from [teacher]: [title]"

### 2. Session Notifications
- **30 minutes before:** "Class starting soon: [classroom] at [time]"
- **10 minutes before:** "Class starting in 10 minutes: [classroom]"
- **Cancellation:** "Class cancelled: [classroom] on [date]"

### 3. Grade Notifications
- **New grade posted:** "New grade posted for [assignment]: [score]"
- **Report card available:** "Your report card is now available"

### 4. Invoice Notifications
- **New invoice:** "New invoice from [academy]: ₩[amount]"
- **Payment reminder:** "Invoice due in 3 days: ₩[amount]"
- **Overdue notice:** "Invoice overdue: ₩[amount]"
- **Payment confirmed:** "Payment received: ₩[amount]"

### 5. General Notifications
- **Announcements:** Important messages from academy/teachers
- **Schedule changes:** Changes to class schedule

## Estimated Timeline
- Phase 1-2: 1-2 days (Core PWA setup)
- Phase 3: 3-4 days (Push notifications implementation)
- Phase 4: 1 day (PWA optimizations)
- Phase 5-6: 2 days (Platform-specific)
- Phase 7: 2 days (Performance & UX)
- Phase 8: 2-3 days (Testing)
- Phase 9: 1 day (Documentation & deployment)

**Total: 12-15 days**

## Notes
- Service worker will only work on HTTPS (production)
- iOS push notifications only work on iOS 16.4+ and require PWA installation
- Android has full web push support
- Consider incremental rollout for testing
- Monitor service worker cache size
- Plan for service worker versioning/updates
- **VAPID keys should be kept secure and not committed to repository**
- **Test notification delivery across different network conditions**
- **Consider rate limiting on notification sending API**
- **Implement notification preferences to prevent spam**
