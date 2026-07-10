// Focus Hub - Custom Service Worker for Push Notifications
// This file runs in the background even when the app is closed

// Listen for push events from the server
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    let data = {
        title: 'Focus Hub',
        body: 'Você tem uma nova notificação.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        url: '/',
    };

    if (event.data) {
        try {
            const payload = event.data.json();
            data = { ...data, ...payload };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192.png',
        badge: data.badge || '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
        },
        actions: [
            { action: 'open', title: 'Abrir' },
            { action: 'close', title: 'Fechar' },
        ],
        // iOS requires these for lock screen notifications
        requireInteraction: true,
        tag: data.tag || 'focushub-' + Date.now(),
        renotify: true,
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Handle notification click - open the app
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click:', event.action);

    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if app is already open
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    return client;
                }
            }
            // If not open, open a new window
            return clients.openWindow(urlToOpen);
        })
    );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification dismissed');
});
