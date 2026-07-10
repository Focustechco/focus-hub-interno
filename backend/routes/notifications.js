const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const pushService = require('../services/pushService');

// GET /api/notifications - Get notifications for current user
router.get('/', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ message: 'userId é obrigatório' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [userId]
        );

        // Map to frontend expected format
        const notifications = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            type: row.type,
            message: row.message,
            linkTo: row.link_to,
            isRead: row.is_read,
            createdAt: row.created_at,
            taskId: row.task_id
        }));

        res.json(notifications);
    } catch (err) {
        console.error('[GET /notifications] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Notification type to push title mapping
const pushTitleMap = {
    'TASK_ASSIGNED': '📋 Nova Tarefa Atribuída',
    'TASK_STATUS_CHANGED': '🔄 Atualização de Tarefa',
    'NEW_POST': '📝 Nova Publicação',
    'TASK_DUE_SOON': '⏰ Prazo Próximo',
};

// POST /api/notifications - Create new notification
router.post('/', async (req, res) => {
    const { userId, type, message, linkTo, taskId } = req.body;

    if (!userId || !type || !message) {
        return res.status(400).json({ message: 'userId, type e message são obrigatórios' });
    }

    try {
        const id = 'n' + Date.now();
        await pool.query(
            `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, userId, type, message, linkTo || 'dashboard', false, taskId || null]
        );

        const newNotification = {
            id,
            userId,
            type,
            message,
            linkTo: linkTo || 'dashboard',
            isRead: false,
            createdAt: new Date().toISOString(),
            taskId: taskId || null
        };

        // Send real Web Push notification to user's devices (non-blocking)
        pushService.sendPushToUser(userId, {
            title: pushTitleMap[type] || 'Focus Hub',
            body: message,
            url: '/',
            tag: `notification-${type}-${id}`,
        }).catch(err => {
            console.warn('[POST /notifications] Push notification failed (non-blocking):', err.message);
        });

        res.status(201).json(newNotification);
    } catch (err) {
        console.error('[POST /notifications] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Notificação não encontrada' });
        }

        res.json({ message: 'Marcada como lida', id });
    } catch (err) {
        console.error('[PUT /notifications/:id/read] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/notifications/mark-all-read - Mark all as read for a user
router.put('/mark-all-read', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'userId é obrigatório' });
    }

    try {
        await pool.query(
            'UPDATE notifications SET is_read = true WHERE user_id = $1',
            [userId]
        );

        res.json({ message: 'Todas as notificações marcadas como lidas' });
    } catch (err) {
        console.error('[PUT /notifications/mark-all-read] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM notifications WHERE id = $1 RETURNING id', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Notificação não encontrada' });
        }

        res.json({ message: 'Notificação deletada', id });
    } catch (err) {
        console.error('[DELETE /notifications/:id] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
