const webpush = require('web-push');
const { pool } = require('../config/db');

// VAPID keys for Web Push notifications
// Generated via webpush.generateVAPIDKeys()
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkOs-bI3cJDQyKClZNA1QQ_jmFCrh0Fi0JIn0w5sHE';
const VAPID_PRIVATE_KEY = 'UUxI4o8r315eMbHe2MX9hNARkUm2jIiTuiaKRcaqksg';
const VAPID_SUBJECT = 'mailto:admin@focushub.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/**
 * Send a push notification to all subscribed devices for a user
 * @param {string} userId - The user ID to send push to
 * @param {object} payload - Notification payload { title, body, icon, badge, url }
 */
async function sendPushToUser(userId, payload) {
    try {
        const result = await pool.query(
            'SELECT * FROM push_subscriptions WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            console.log(`[PushService] No push subscriptions found for user ${userId}`);
            return;
        }

        const notificationPayload = JSON.stringify({
            title: payload.title || 'Focus Hub',
            body: payload.body || '',
            icon: payload.icon || '/icons/icon-192.png',
            badge: payload.badge || '/icons/icon-192.png',
            url: payload.url || '/',
            tag: payload.tag || 'focushub-' + Date.now(),
            timestamp: Date.now()
        });

        const sendPromises = result.rows.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, notificationPayload);
                console.log(`[PushService] Push sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
            } catch (err) {
                console.error(`[PushService] Error sending push to endpoint ${sub.endpoint.substring(0, 50)}:`, err.message);

                // Remove expired or invalid subscriptions (410 Gone or 404 Not Found)
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`[PushService] Removing expired subscription: ${sub.id}`);
                    await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                }
            }
        });

        await Promise.allSettled(sendPromises);
        console.log(`[PushService] Push notifications processed for user ${userId}`);
    } catch (err) {
        console.error('[PushService] Error in sendPushToUser:', err);
    }
}

/**
 * Save a push subscription for a user
 * @param {string} userId - The user ID
 * @param {object} subscription - The PushSubscription object from the browser
 */
async function saveSubscription(userId, subscription) {
    const { endpoint, keys } = subscription;
    const id = 'ps_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    try {
        // Upsert: if endpoint already exists, update the keys
        await pool.query(
            `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (endpoint) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth`,
            [id, userId, endpoint, keys.p256dh, keys.auth]
        );

        console.log(`[PushService] Subscription saved for user ${userId}`);
        return { success: true };
    } catch (err) {
        console.error('[PushService] Error saving subscription:', err);
        throw err;
    }
}

/**
 * Remove a push subscription by endpoint
 * @param {string} userId - The user ID
 * @param {string} endpoint - The subscription endpoint URL
 */
async function removeSubscription(userId, endpoint) {
    try {
        const result = await pool.query(
            'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2 RETURNING id',
            [userId, endpoint]
        );

        if (result.rowCount === 0) {
            console.log(`[PushService] No subscription found to remove for user ${userId}`);
            return { success: false, message: 'Subscription not found' };
        }

        console.log(`[PushService] Subscription removed for user ${userId}`);
        return { success: true };
    } catch (err) {
        console.error('[PushService] Error removing subscription:', err);
        throw err;
    }
}

/**
 * Get the VAPID public key for frontend use
 * @returns {string} The VAPID public key
 */
function getVapidPublicKey() {
    return VAPID_PUBLIC_KEY;
}

module.exports = {
    sendPushToUser,
    saveSubscription,
    removeSubscription,
    getVapidPublicKey
};
