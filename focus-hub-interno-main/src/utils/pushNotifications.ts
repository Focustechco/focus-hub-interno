/**
 * Push Notification Utility for Focus Hub
 * Uses Web Push API for browser notifications
 */

export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
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
    return Notification.permission;
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
 * Show a local notification
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

    new Notification(title, defaultOptions);
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
    getNotificationPermission,
    requestNotificationPermission,
    showNotification,
    NotificationPresets,
    scheduleNotification,
    cancelScheduledNotification,
};
