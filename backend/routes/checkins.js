const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

const FORTALEZA_TIMEZONE = 'America/Fortaleza';

const formatTimestamp = (value) => {
    if (!value) return null;

    if (typeof value === 'string') {
        if (value.includes('T')) return value.slice(0, 19);
        if (value.includes(' ')) return value.replace(' ', 'T').slice(0, 19);
        return value;
    }

    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        const hours = String(value.getHours()).padStart(2, '0');
        const minutes = String(value.getMinutes()).padStart(2, '0');
        const seconds = String(value.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    return null;
};

const mapCheckInRow = (row, user = {}) => ({
    id: row.id,
    userId: row.user_id,
    userName: user.name || row.user_name || 'Unknown',
    userAvatar: user.avatar_url || row.user_avatar || '',
    type: row.type,
    checkInTime: formatTimestamp(row.timestamp),
    checkOutTime: formatTimestamp(row.check_out_time),
    dailyReport: row.daily_report,
    location: row.location,
    mood: row.mood,
    notes: row.notes
});

// GET /api/checkins - Get all check-ins
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, u.name as user_name, u.avatar_url as user_avatar
            FROM check_ins c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.timestamp DESC
        `);

        const checkIns = result.rows.map(row => mapCheckInRow(row));
        res.json(checkIns);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/checkins - Create a new check-in
router.post('/', async (req, res) => {
    const { userId, type, location, mood, notes } = req.body;
    console.log(`[POST /checkins] Received request for user: ${userId}`);

    try {
        const id = 'c' + Date.now();
        const result = await pool.query(
            `INSERT INTO check_ins (id, user_id, type, timestamp, location, mood, notes)
             VALUES ($1, $2, $3, timezone('${FORTALEZA_TIMEZONE}', NOW()), $4, $5, $6)
             RETURNING *`,
            [id, userId, type, location, mood, notes]
        );

        const userResult = await pool.query('SELECT name, avatar_url FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0] || {};
        const newCheckIn = mapCheckInRow(result.rows[0], user);

        console.log('[POST /checkins] Returning:', newCheckIn);
        res.status(201).json(newCheckIn);
    } catch (err) {
        console.error('[POST /checkins] ERROR:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/checkins/:id - Update a check-in (Check-out or Daily Report)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { checkOutTime, dailyReport } = req.body;

    try {
        const updates = [];
        const values = [];

        if (typeof checkOutTime !== 'undefined') {
            updates.push(`check_out_time = timezone('${FORTALEZA_TIMEZONE}', NOW())`);
        }

        if (typeof dailyReport !== 'undefined') {
            values.push(dailyReport);
            updates.push(`daily_report = $${values.length}`);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(id);
        const result = await pool.query(
            `UPDATE check_ins
             SET ${updates.join(', ')}
             WHERE id = $${values.length}
             RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Check-in not found' });
        }

        const userResult = await pool.query(
            'SELECT name, avatar_url FROM users WHERE id = $1',
            [result.rows[0].user_id]
        );
        const user = userResult.rows[0] || {};
        const updatedCheckIn = mapCheckInRow(result.rows[0], user);

        res.json(updatedCheckIn);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/checkins/:id - Delete a check-in
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM check_ins WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Check-in not found' });
        }
        res.json({ message: 'Check-in deleted', id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
