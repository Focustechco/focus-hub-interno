/**
 * Push Notification Utility for Focus Hub
 * Supports real Web Push API for background/lock screen notifications on iOS & Android
 */

import api from '../../services/api';

// VAPID public key - must match the backend's VAPID key pair
// This will be fetched from the backend on first use
let vapidPublicKey: string | null = null;

const PUSH_ENABLED_KEY = 'focushub_push_enabled';
const PUSH_SUBSCRIPTION_KEY = 'focushub_push_subscription';

/**
 * Convert a base64 URL-safe string to a Uint8Array (required by PushManager)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
}

/**
 * Check if push notifications have been enabled (persisted in localStorage)
 */
export function isPushEnabled(): boolean {
    return localStorage.getItem(PUSH_ENABLED_KEY) === 'true';
}

/**
 * Fetch VAPID public key from the backend
 */
async function getVapidPublicKey(): Promise<string> {
    if (vapidPublicKey) return vapidPublicKey;

    try {
        const response = await api.get('/push/vapid-public-key');
        vapidPublicKey = response.data.publicKey;
        return vapidPublicKey!;
    } catch (error) {
        console.error('[Push] Failed to fetch VAPID key:', error);
        throw new Error('Failed to fetch VAPID public key');
    }
}

/**
 * Get the active service worker registration
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;

    try {
        const registration = await navigator.serviceWorker.ready;
        return registration;
    } catch (error) {
        console.error('[Push] Service worker not ready:', error);
        return null;
    }
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isPushSupported()) {
        console.warn('[Push] Notifications not supported in this browser');
        return 'denied';
    }

    try {
        const permission = await Notification.requestPermission();
        console.log('[Push] Permission:', permission);
        return permission;
    } catch (error) {
        console.error('[Push] Error requesting permission:', error);
        return 'denied';
    }
}

/**
 * Subscribe to push notifications via Service Worker PushManager
 * This registers the device with the browser's push service and sends
 * the subscription to our backend to store it.
 */
export async function subscribeToPush(): Promise<boolean> {
    if (!isPushSupported()) {
        console.warn('[Push] Push not supported');
        return false;
    }

    try {
        // Step 1: Request permission
        const permission = await requestNotificationPermission();
        if (permission !== 'granted') {
            console.warn('[Push] Permission not granted');
            return false;
        }

        // Step 2: Get service worker registration
        const registration = await getServiceWorkerRegistration();
        if (!registration) {
            console.error('[Push] No service worker registration');
            return false;
        }

        // Step 3: Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Step 4: Get VAPID key from backend
            const publicKey = await getVapidPublicKey();
            const applicationServerKey = urlBase64ToUint8Array(publicKey);

            // Step 5: Subscribe via PushManager
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });

            console.log('[Push] New subscription created:', subscription.endpoint);
        } else {
            console.log('[Push] Already subscribed:', subscription.endpoint);
        }

        // Step 6: Send subscription to our backend
        await api.post('/push/subscribe', {
            subscription: subscription.toJSON(),
        });

        // Step 7: Persist enabled state
        localStorage.setItem(PUSH_ENABLED_KEY, 'true');
        localStorage.setItem(PUSH_SUBSCRIPTION_KEY, JSON.stringify(subscription.toJSON()));

        console.log('[Push] Successfully subscribed and saved to backend');
        return true;
    } catch (error) {
        console.error('[Push] Subscription failed:', error);
        return false;
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    try {
        const registration = await getServiceWorkerRegistration();
        if (!registration) return false;

        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            // Remove from backend
            try {
                await api.delete('/push/unsubscribe', {
                    data: { endpoint: subscription.endpoint },
                });
            } catch (e) {
                console.warn('[Push] Failed to remove subscription from backend:', e);
            }

            // Unsubscribe locally
            await subscription.unsubscribe();
        }

        localStorage.removeItem(PUSH_ENABLED_KEY);
        localStorage.removeItem(PUSH_SUBSCRIPTION_KEY);

        console.log('[Push] Unsubscribed successfully');
        return true;
    } catch (error) {
        console.error('[Push] Unsubscribe failed:', error);
        return false;
    }
}

/**
 * Re-subscribe if push was previously enabled (for use on app startup)
 * This handles the case where the user already enabled push in a previous session.
 */
export async function resubscribeIfEnabled(): Promise<void> {
    if (!isPushSupported()) return;
    if (!isPushEnabled()) return;
    if (getNotificationPermission() !== 'granted') return;

    try {
        const registration = await getServiceWorkerRegistration();
        if (!registration) return;

        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            // Re-send to backend in case it was lost
            await api.post('/push/subscribe', {
                subscription: subscription.toJSON(),
            }).catch(() => {
                // Silently fail - subscription might already exist
            });
            console.log('[Push] Re-subscribed existing push subscription');
        } else {
            // Had push enabled but lost subscription - re-subscribe
            console.log('[Push] Re-subscribing (lost subscription)...');
            await subscribeToPush();
        }
    } catch (error) {
        console.error('[Push] Re-subscription failed:', error);
    }
}

/**
 * Show a local notification (fallback when app is in foreground)
 */
export function showNotification(title: string, options?: NotificationOptions): void {
    if (getNotificationPermission() !== 'granted') {
        console.warn('[Push] Notification permission not granted');
        return;
    }

    const defaultOptions: NotificationOptions = {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        tag: 'focushub-notification',
        ...options,
    };

    // Try to use SW registration for notification (works better on mobile)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, defaultOptions);
        }).catch(() => {
            // Fallback to native Notification API
            new Notification(title, defaultOptions);
        });
    } else {
        new Notification(title, defaultOptions);
    }
}

/**
 * Notification presets for common events
 */
export const NotificationPresets = {
    taskDueSoon: (taskTitle: string) => showNotification(
        '⏰ Prazo se aproximando',
        {
            body: `A tarefa "${taskTitle}" vence em breve!`,
            tag: 'task-due-soon',
            requireInteraction: true,
        }
    ),

    taskOverdue: (taskTitle: string) => showNotification(
        '⚠️ Tarefa Atrasada',
        {
            body: `A tarefa "${taskTitle}" está atrasada!`,
            tag: 'task-overdue',
            requireInteraction: true,
        }
    ),

    goalCompleted: (goalTitle: string) => showNotification(
        '🎯 Meta Alcançada!',
        {
            body: `Parabéns! Você completou: "${goalTitle}"`,
            tag: 'goal-completed',
        }
    ),

    newPost: (authorName: string) => showNotification(
        '📝 Nova Publicação',
        {
            body: `${authorName} publicou no mural da equipe`,
            tag: 'new-post',
        }
    ),

    checkInReminder: () => showNotification(
        '👋 Lembrete de Check-in',
        {
            body: 'Não esqueça de registrar seu ponto hoje!',
            tag: 'checkin-reminder',
        }
    ),
};

/**
 * Schedule a notification for later
 */
export function scheduleNotification(title: string, options: NotificationOptions, delayMs: number): number {
    return window.setTimeout(() => {
        showNotification(title, options);
    }, delayMs);
}

/**
 * Cancel a scheduled notification
 */
export function cancelScheduledNotification(timeoutId: number): void {
    window.clearTimeout(timeoutId);
}

export default {
    isPushSupported,
    isPushEnabled,
    getNotificationPermission,
    requestNotificationPermission,
    subscribeToPush,
    unsubscribeFromPush,
    resubscribeIfEnabled,
    showNotification,
    NotificationPresets,
    scheduleNotification,
    cancelScheduledNotification,
};
