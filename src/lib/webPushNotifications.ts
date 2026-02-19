import { supabase } from '@/lib/supabase';

/**
 * Convert a base64 URL-safe string to a Uint8Array (for VAPID applicationServerKey)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if Web Push is supported in this browser
 */
export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service worker registered');
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Subscribe to web push notifications using VAPID
 */
export async function subscribeToWebPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('VAPID public key not configured');
    return null;
  }

  // Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.log('Notification permission not granted');
    return null;
  }

  try {
    // Check for existing subscription first
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      return existing;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.log('Web push subscription created');
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to web push:', error);
    return null;
  }
}

/**
 * Save web push subscription to device_tokens table
 */
export async function saveWebPushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const token = JSON.stringify(subscription.toJSON());

    const { error } = await supabase.from('device_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: 'web' as const,
        is_active: true,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );

    if (error) {
      console.error('Error saving web push subscription:', error);
      return false;
    }

    console.log('Web push subscription saved');
    return true;
  } catch (error) {
    console.error('Error saving web push subscription:', error);
    return false;
  }
}

/**
 * Full web push initialization flow: register SW → subscribe → save to DB
 */
export async function initializeWebPush(userId: string): Promise<PushSubscription | null> {
  if (!isWebPushSupported()) return null;

  const registration = await registerServiceWorker();
  if (!registration) return null;

  const subscription = await subscribeToWebPush(registration);
  if (!subscription) return null;

  await saveWebPushSubscription(userId, subscription);
  return subscription;
}

/**
 * Deactivate web push token in DB on logout (does NOT unsubscribe from browser,
 * so re-login can reuse the same subscription without re-prompting)
 */
export async function cleanupWebPush(userId: string): Promise<void> {
  if (!isWebPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const token = JSON.stringify(subscription.toJSON());

      await supabase
        .from('device_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('token', token);

      console.log('Web push token deactivated');
    }
  } catch (error) {
    console.error('Error cleaning up web push:', error);
  }
}

/**
 * Listen for postMessage from service worker when a notification is clicked.
 * Returns a cleanup function to remove the listener.
 */
export function setupWebPushNavigationListener(
  onNavigate: (path: string) => void
): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.path) {
      onNavigate(event.data.path);
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}
