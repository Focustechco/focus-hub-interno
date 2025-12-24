const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/daily-checklist - Get items for current user and date
router.get('/', async (req, res) => {
    const { userId, date } = req.query;

    if (!userId) {
        return res.status(400).json({ message: 'userId é obrigatório' });
    }

    try {
        let query = 'SELECT * FROM daily_checklist WHERE user_id = $1';
        const params = [userId];

        if (date) {
            query += ' AND date = $2';
            params.push(date);
        }

        query += ' ORDER BY id ASC';

        const result = await pool.query(query, params);

        // Map to frontend expected format
        const items = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            text: row.text,
            completed: row.completed,
            date: row.date
        }));

        res.json(items);
    } catch (err) {
        console.error('[GET /daily-checklist] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/daily-checklist - Create new item
router.post('/', async (req, res) => {
    const { userId, text, date } = req.body;

    if (!userId || !text || !date) {
        return res.status(400).json({ message: 'userId, text e date são obrigatórios' });
    }

    try {
        const id = 'dc' + Date.now();
        await pool.query(
            'INSERT INTO daily_checklist (id, user_id, text, completed, date) VALUES ($1, $2, $3, $4, $5)',
            [id, userId, text, false, date]
        );

        const newItem = {
            id,
            userId,
            text,
            completed: false,
            date
        };

        res.status(201).json(newItem);
    } catch (err) {
        console.error('[POST /daily-checklist] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/daily-checklist/:id - Update item (toggle completion or update text)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { completed, text } = req.body;

    try {
        // Build dynamic update query
        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (completed !== undefined) {
            updates.push(`completed = $${paramIndex++}`);
            params.push(completed);
        }

        if (text !== undefined) {
            updates.push(`text = $${paramIndex++}`);
            params.push(text);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo para atualizar' });
        }

        params.push(id);
        const query = `UPDATE daily_checklist SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

        const result = await pool.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Item não encontrado' });
        }

        const row = result.rows[0];
        res.json({
            id: row.id,
            userId: row.user_id,
            text: row.text,
            completed: row.completed,
            date: row.date
        });
    } catch (err) {
        console.error('[PUT /daily-checklist/:id] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/daily-checklist/:id - Delete item
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const user = req.user; // Populated by authMiddleware

    try {
        // Check item existence and ownership
        const itemCheck = await pool.query('SELECT user_id FROM daily_checklist WHERE id = $1', [id]);

        if (itemCheck.rowCount === 0) {
            return res.status(404).json({ message: 'Item não encontrado' });
        }

        const item = itemCheck.rows[0];

        // Permission check: Admin or Owner only
        if (user.role !== 'ADMIN' && user.id !== item.user_id) {
            return res.status(403).json({ message: 'Você não tem permissão para excluir este item.' });
        }

        const result = await pool.query('DELETE FROM daily_checklist WHERE id = $1 RETURNING id', [id]);

        res.json({ message: 'Item deletado', id });
    } catch (err) {
        console.error('[DELETE /daily-checklist/:id] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
