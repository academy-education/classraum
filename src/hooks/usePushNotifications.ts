"use client"

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import {
  isNativeApp,
  initializePushNotifications,
  cleanupPushNotifications,
  setupPushNotificationListeners,
  removeAllDeliveredNotifications,
} from '@/lib/pushNotifications'
import {
  isWebPushSupported,
  initializeWebPush,
  cleanupWebPush,
  setupWebPushNavigationListener,
} from '@/lib/webPushNotifications'
import type { PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications'

// Firebase is configured with google-services.json in android/app/
const FIREBASE_CONFIGURED = true;

interface UsePushNotificationsOptions {
  userId: string | null
  enabled?: boolean
}

export function usePushNotifications({ userId, enabled = true }: UsePushNotificationsOptions) {
  const router = useRouter()
  const tokenRef = useRef<string | null>(null)
  const listenersCleanupRef = useRef<(() => Promise<void>) | null>(null)
  const webPushCleanupRef = useRef<(() => void) | null>(null)

  // Check if push notifications should be enabled (native or web)
  const isPushEnabled = useCallback(() => {
    if (!enabled) return false;

    // Native app push
    if (isNativeApp()) {
      if (Capacitor.getPlatform() === 'android' && !FIREBASE_CONFIGURED) {
        console.log('Push notifications disabled on Android - Firebase not configured');
        return false;
      }
      return true;
    }

    // Web push
    if (isWebPushSupported()) {
      return true;
    }

    return false;
  }, [enabled]);

  // Handle notification received in foreground
  const handleNotificationReceived = useCallback((notification: PushNotificationSchema) => {
    console.log('Push notification received:', notification)
  }, [])

  // Handle notification tap (native)
  const handleNotificationAction = useCallback((action: ActionPerformed) => {
    console.log('Push notification action:', action)

    const data = action.notification.data as Record<string, unknown> | undefined
    if (!data) return

    const navigationType = data.type as string | undefined
    const navigationId = data.id as string | undefined

    switch (navigationType) {
      case 'session':
        if (navigationId) {
          router.push(`/mobile/session/${navigationId}`)
        }
        break
      case 'assignment':
        if (navigationId) {
          router.push(`/mobile/assignments?id=${navigationId}`)
        }
        break
      case 'message':
        if (navigationId) {
          router.push(`/mobile/messages/${navigationId}`)
        }
        break
      case 'grade':
        router.push('/mobile/assignments')
        break
      case 'announcement':
        router.push('/mobile/notifications')
        break
      default:
        router.push('/mobile/notifications')
    }

    removeAllDeliveredNotifications()
  }, [router])

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (!userId || !isPushEnabled()) {
      return
    }

    let isMounted = true

    const init = async () => {
      try {
        if (isNativeApp()) {
          // Native push (existing flow)
          const token = await initializePushNotifications(userId)
          if (isMounted && token) {
            tokenRef.current = token
            console.log('Push notifications initialized with token:', token.substring(0, 20) + '...')
          }

          if (isMounted) {
            const cleanup = await setupPushNotificationListeners({
              onNotificationReceived: handleNotificationReceived,
              onNotificationActionPerformed: handleNotificationAction,
            })
            listenersCleanupRef.current = cleanup
          }
        } else if (isWebPushSupported()) {
          // Web push
          const subscription = await initializeWebPush(userId)
          if (isMounted && subscription) {
            tokenRef.current = JSON.stringify(subscription.toJSON())
            console.log('Web push notifications initialized')
          }

          // Listen for notification clicks from service worker
          if (isMounted) {
            const cleanup = setupWebPushNavigationListener((path) => {
              router.push(path)
            })
            webPushCleanupRef.current = cleanup
          }
        }
      } catch (error) {
        console.error('Failed to initialize push notifications:', error)
      }
    }

    init()

    return () => {
      isMounted = false

      if (listenersCleanupRef.current) {
        listenersCleanupRef.current().catch(console.error)
        listenersCleanupRef.current = null
      }

      if (webPushCleanupRef.current) {
        webPushCleanupRef.current()
        webPushCleanupRef.current = null
      }
    }
  }, [userId, isPushEnabled, handleNotificationReceived, handleNotificationAction, router])

  // Cleanup on logout
  const cleanup = useCallback(async () => {
    if (!userId) return

    try {
      if (isNativeApp()) {
        await cleanupPushNotifications(userId)
      } else if (isWebPushSupported()) {
        await cleanupWebPush(userId)
      }
      tokenRef.current = null
    } catch (error) {
      console.error('Failed to cleanup push notifications:', error)
    }
  }, [userId])

  return {
    isNativeApp: isNativeApp(),
    isPushSupported: isNativeApp() || isWebPushSupported(),
    token: tokenRef.current,
    cleanup,
  }
}
