import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { createClient } from '@/lib/supabase';

export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_name?: string;
  app_version?: string;
  is_active: boolean;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

// Check if we're running in a native app
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

// Get the current platform
export function getPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

// Check if push notifications are supported (FCM configured)
export async function isPushNotificationsSupported(): Promise<boolean> {
  if (!isNativeApp()) {
    return false;
  }

  try {
    // Try to check permissions - this will fail if FCM is not configured
    await PushNotifications.checkPermissions();
    return true;
  } catch (error) {
    console.log('Push notifications not supported (FCM not configured):', error);
    return false;
  }
}

// Request push notification permissions
export async function requestPushPermissions(): Promise<boolean> {
  if (!isNativeApp()) {
    console.log('Push notifications only available in native app');
    return false;
  }

  try {
    // First check if push notifications are supported
    const isSupported = await isPushNotificationsSupported();
    if (!isSupported) {
      console.log('Push notifications not supported on this device/configuration');
      return false;
    }

    // Check current permission status
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      // Request permissions
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('Push notification permission not granted');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting push permissions:', error);
    return false;
  }
}

// Register for push notifications
export async function registerPushNotifications(): Promise<string | null> {
  if (!isNativeApp()) {
    console.log('Push notifications only available in native app');
    return null;
  }

  // Check if push notifications are supported first
  const isSupported = await isPushNotificationsSupported();
  if (!isSupported) {
    console.log('Push notifications not supported, skipping registration');
    return null;
  }

  const hasPermission = await requestPushPermissions();
  if (!hasPermission) {
    return null;
  }

  let registrationListener: { remove: () => Promise<void> } | null = null;
  let errorListener: { remove: () => Promise<void> } | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let resolved = false;

  const cleanup = async () => {
    if (timeoutId) clearTimeout(timeoutId);
    try {
      if (registrationListener) await registrationListener.remove();
      if (errorListener) await errorListener.remove();
    } catch (e) {
      console.log('Listener cleanup error (can be ignored):', e);
    }
  };

  try {
    return await new Promise<string | null>(async (resolve) => {
      const safeResolve = async (value: string | null) => {
        if (!resolved) {
          resolved = true;
          await cleanup();
          resolve(value);
        }
      };

      try {
        // Set up listeners BEFORE calling register
        registrationListener = await PushNotifications.addListener('registration', async (token: Token) => {
          console.log('Push registration success, token:', token.value);
          await safeResolve(token.value);
        });

        errorListener = await PushNotifications.addListener('registrationError', async (error) => {
          console.error('Push registration error:', error);
          await safeResolve(null);
        });

        // Timeout after 10 seconds
        timeoutId = setTimeout(async () => {
          console.warn('Push notification registration timed out');
          await safeResolve(null);
        }, 10000);

        // Now register with APNs/FCM
        await PushNotifications.register();
      } catch (innerError) {
        console.error('Error setting up push registration:', innerError);
        await safeResolve(null);
      }
    });
  } catch (error) {
    console.error('Error during push registration:', error);
    await cleanup();
    return null;
  }
}

// Save device token to Supabase
export async function saveDeviceToken(userId: string, token: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const platform = getPlatform();

    // Upsert the token (insert or update if exists)
    const { error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: userId,
          token: token,
          platform: platform,
          is_active: true,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        }
      );

    if (error) {
      console.error('Error saving device token:', error);
      return false;
    }

    console.log('Device token saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving device token:', error);
    return false;
  }
}

// Remove device token (on logout)
export async function removeDeviceToken(userId: string, token: string): Promise<boolean> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('device_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      console.error('Error removing device token:', error);
      return false;
    }

    console.log('Device token deactivated successfully');
    return true;
  } catch (error) {
    console.error('Error removing device token:', error);
    return false;
  }
}

// Delete all device tokens for a user (on account deletion)
export async function deleteAllDeviceTokens(userId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting device tokens:', error);
      return false;
    }

    console.log('All device tokens deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting device tokens:', error);
    return false;
  }
}

// Notification handler callbacks type
export interface PushNotificationHandlers {
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onNotificationActionPerformed?: (action: ActionPerformed) => void;
}

// Set up notification listeners
export async function setupPushNotificationListeners(handlers: PushNotificationHandlers): Promise<() => Promise<void>> {
  if (!isNativeApp()) {
    return async () => {};
  }

  const listeners: { remove: () => Promise<void> }[] = [];

  try {
    // Handle notifications received while app is in foreground
    if (handlers.onNotificationReceived) {
      const listener = await PushNotifications.addListener('pushNotificationReceived', handlers.onNotificationReceived);
      listeners.push(listener);
    }

    // Handle notification tap/action
    if (handlers.onNotificationActionPerformed) {
      const listener = await PushNotifications.addListener('pushNotificationActionPerformed', handlers.onNotificationActionPerformed);
      listeners.push(listener);
    }
  } catch (error) {
    console.error('Error setting up push notification listeners:', error);
  }

  // Return cleanup function
  return async () => {
    for (const listener of listeners) {
      try {
        await listener.remove();
      } catch (e) {
        console.log('Error removing listener:', e);
      }
    }
  };
}

// Initialize push notifications for a user
export async function initializePushNotifications(userId: string): Promise<string | null> {
  if (!isNativeApp()) {
    return null;
  }

  try {
    const token = await registerPushNotifications();

    if (token) {
      await saveDeviceToken(userId, token);
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return null;
  }
}

// Clean up push notifications on logout
export async function cleanupPushNotifications(userId: string): Promise<void> {
  if (!isNativeApp()) {
    return;
  }

  try {
    // Get the current token
    const token = await new Promise<string | null>((resolve) => {
      PushNotifications.addListener('registration', (t: Token) => {
        resolve(t.value);
      });

      // If we don't get a token in 3 seconds, give up
      setTimeout(() => resolve(null), 3000);

      PushNotifications.register();
    });

    if (token) {
      await removeDeviceToken(userId, token);
    }

    // Remove all listeners
    await PushNotifications.removeAllListeners();
  } catch (error) {
    console.error('Error cleaning up push notifications:', error);
  }
}

// Get delivered notifications (for badge management)
export async function getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
  if (!isNativeApp()) {
    return [];
  }

  try {
    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications;
  } catch (error) {
    console.error('Error getting delivered notifications:', error);
    return [];
  }
}

// Remove all delivered notifications
export async function removeAllDeliveredNotifications(): Promise<void> {
  if (!isNativeApp()) {
    return;
  }

  try {
    await PushNotifications.removeAllDeliveredNotifications();
  } catch (error) {
    console.error('Error removing delivered notifications:', error);
  }
}
