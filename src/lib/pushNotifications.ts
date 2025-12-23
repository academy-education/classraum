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

// Request push notification permissions
export async function requestPushPermissions(): Promise<boolean> {
  if (!isNativeApp()) {
    console.log('Push notifications only available in native app');
    return false;
  }

  try {
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

  const hasPermission = await requestPushPermissions();
  if (!hasPermission) {
    return null;
  }

  return new Promise((resolve) => {
    // Listen for registration success
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      resolve(token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
      resolve(null);
    });

    // Register with APNs/FCM
    PushNotifications.register();
  });
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
export function setupPushNotificationListeners(handlers: PushNotificationHandlers): () => void {
  if (!isNativeApp()) {
    return () => {};
  }

  const listeners: (() => Promise<void>)[] = [];

  // Handle notifications received while app is in foreground
  if (handlers.onNotificationReceived) {
    PushNotifications.addListener('pushNotificationReceived', handlers.onNotificationReceived)
      .then(listener => listeners.push(() => listener.remove()));
  }

  // Handle notification tap/action
  if (handlers.onNotificationActionPerformed) {
    PushNotifications.addListener('pushNotificationActionPerformed', handlers.onNotificationActionPerformed)
      .then(listener => listeners.push(() => listener.remove()));
  }

  // Return cleanup function
  return () => {
    listeners.forEach(remove => remove());
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
