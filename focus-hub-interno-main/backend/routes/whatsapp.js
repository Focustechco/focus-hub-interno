const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const { authMiddleware } = require('../middleware/auth');

// GET /api/whatsapp/qr
// Returns the current QR code (if waiting for scan) and status
router.get('/qr', authMiddleware, (req, res) => {
    // Only admins should see this? For now, let's allow authenticated users, 
    // but maybe restrict to ADMIN in future.
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const data = whatsappService.getQrCode();
    res.json(data);
});

// GET /api/whatsapp/status
router.get('/status', authMiddleware, (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ status: whatsappService.status });
});

// POST /api/whatsapp/send (Manual test)
router.post('/send', authMiddleware, async (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const { to, message } = req.body;
    if (!to || !message) {
        return res.status(400).json({ message: 'Missing to or message' });
    }

    const success = await whatsappService.sendMessage(to, message);
    if (success) {
        res.json({ message: 'Message sent' });
    } else {
        res.status(500).json({ message: 'Failed to send message' });
    }
});

// GET /api/whatsapp/logs - Get message history (Admin only)
router.get('/logs', authMiddleware, async (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Acesso negado' });
    }

    try {
        const { pool } = require('../config/db');
        const result = await pool.query(
            `SELECT wl.*, u.name as user_name 
             FROM whatsapp_logs wl
             LEFT JOIN users u ON wl.user_id = u.id
             ORDER BY wl.created_at DESC
             LIMIT 50`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('[WhatsApp] Error fetching logs:', error);
        res.json([]);
    }
});

// GET /api/whatsapp/stats - Get statistics (Admin only)
router.get('/stats', authMiddleware, async (req, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Acesso negado' });
    }

    try {
        const { pool } = require('../config/db');

        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const todayCount = await pool.query(
            `SELECT COUNT(*) as count FROM whatsapp_logs WHERE DATE(created_at) = $1 AND direction = 'outbound'`,
            [today]
        );

        const weekCount = await pool.query(
            `SELECT COUNT(*) as count FROM whatsapp_logs WHERE DATE(created_at) >= $1 AND direction = 'outbound'`,
            [weekAgo]
        );

        const connectedUsers = await pool.query(
            `SELECT COUNT(*) as count FROM users WHERE whatsapp IS NOT NULL`
        );

        res.json({
            sentToday: parseInt(todayCount.rows[0]?.count || 0),
            sentThisWeek: parseInt(weekCount.rows[0]?.count || 0),
            connectedUsers: parseInt(connectedUsers.rows[0]?.count || 0),
            status: whatsAppService.status,
            error: whatsAppService.lastError // New field
        });
    } catch (error) {
        console.error('[WhatsApp] Error fetching stats:', error);
        res.json({
            sentToday: 0,
            sentThisWeek: 0,
            connectedUsers: 0,
            status: 'ERROR',
            error: error.message
        });
    }
});

module.exports = router;

// TEMPORARY: Force run migrations
router.get('/migrate-force', async (req, res) => {
    try {
        const { runMigrations } = require('../migrate');
        const result = await runMigrations();
        res.json({ message: 'Migrations executed', result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
