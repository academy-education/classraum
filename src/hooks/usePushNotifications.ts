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

  // Check if push notifications should be enabled
  // On Android, we need Firebase configured (google-services.json)
  const isPushEnabled = useCallback(() => {
    if (!enabled) return false;
    if (!isNativeApp()) return false;

    // On Android, check if Firebase is configured
    if (Capacitor.getPlatform() === 'android' && !FIREBASE_CONFIGURED) {
      console.log('Push notifications disabled on Android - Firebase not configured');
      return false;
    }

    return true;
  }, [enabled]);

  // Handle notification received in foreground
  const handleNotificationReceived = useCallback((notification: PushNotificationSchema) => {
    console.log('Push notification received:', notification)
    // You can show an in-app notification here
    // For now, we'll just log it
  }, [])

  // Handle notification tap
  const handleNotificationAction = useCallback((action: ActionPerformed) => {
    console.log('Push notification action:', action)

    const data = action.notification.data as Record<string, unknown> | undefined
    if (!data) return

    // Navigate based on notification type
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
        // Default to notifications page
        router.push('/mobile/notifications')
    }

    // Clear badge after handling
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
        // Initialize and get token
        const token = await initializePushNotifications(userId)

        if (isMounted && token) {
          tokenRef.current = token
          console.log('Push notifications initialized with token:', token.substring(0, 20) + '...')
        }

        // Set up listeners
        if (isMounted) {
          const cleanup = await setupPushNotificationListeners({
            onNotificationReceived: handleNotificationReceived,
            onNotificationActionPerformed: handleNotificationAction,
          })
          listenersCleanupRef.current = cleanup
        }
      } catch (error) {
        console.error('Failed to initialize push notifications:', error)
      }
    }

    init()

    return () => {
      isMounted = false

      // Clean up listeners
      if (listenersCleanupRef.current) {
        listenersCleanupRef.current().catch(console.error)
        listenersCleanupRef.current = null
      }
    }
  }, [userId, isPushEnabled, handleNotificationReceived, handleNotificationAction])

  // Cleanup on logout
  const cleanup = useCallback(async () => {
    if (!userId || !isNativeApp()) return

    try {
      await cleanupPushNotifications(userId)
      tokenRef.current = null
    } catch (error) {
      console.error('Failed to cleanup push notifications:', error)
    }
  }, [userId])

  return {
    isNativeApp: isNativeApp(),
    token: tokenRef.current,
    cleanup,
  }
}
