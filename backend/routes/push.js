const express = require('express');
const router = express.Router();
const pushService = require('../services/pushService');

// POST /api/push/subscribe - Save a push subscription for the authenticated user
router.post('/subscribe', async (req, res) => {
    const userId = req.user.id;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: 'Subscription inválida. endpoint e keys são obrigatórios.' });
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
        return res.status(400).json({ message: 'Subscription keys incompletas. p256dh e auth são obrigatórios.' });
    }

    try {
        await pushService.saveSubscription(userId, subscription);
        res.status(201).json({ message: 'Subscription salva com sucesso' });
    } catch (err) {
        console.error('[POST /push/subscribe] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/push/unsubscribe - Remove a subscription by endpoint
router.delete('/unsubscribe', async (req, res) => {
    const userId = req.user.id;
    const { endpoint } = req.body;

    if (!endpoint) {
        return res.status(400).json({ message: 'endpoint é obrigatório' });
    }

    try {
        const result = await pushService.removeSubscription(userId, endpoint);

        if (!result.success) {
            return res.status(404).json({ message: 'Subscription não encontrada' });
        }

        res.json({ message: 'Subscription removida com sucesso' });
    } catch (err) {
        console.error('[DELETE /push/unsubscribe] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/push/vapid-public-key - Return the VAPID public key
router.get('/vapid-public-key', (req, res) => {
    try {
        const publicKey = pushService.getVapidPublicKey();
        res.json({ publicKey });
    } catch (err) {
        console.error('[GET /push/vapid-public-key] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
