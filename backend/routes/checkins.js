const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/checkins - Get all check-ins
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, u.name as user_name, u.avatar_url as user_avatar 
            FROM check_ins c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.timestamp DESC
        `);
        // Map database fields to frontend expected format if needed
        const checkIns = result.rows.map(row => ({
            id: row.id,
            userId: row.user_id,
            userName: row.user_name,
            userAvatar: row.user_avatar,
            type: row.type,
            checkInTime: row.timestamp, // Map DB timestamp to frontend checkInTime
            checkOutTime: row.check_out_time, // Map DB check_out_time to frontend checkOutTime
            dailyReport: row.daily_report,
            location: row.location,
            mood: row.mood,
            notes: row.notes
        }));
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
             VALUES ($1, $2, $3, NOW(), $4, $5, $6)
             RETURNING *`,
            [id, userId, type, location, mood, notes]
        );

        console.log(`[POST /checkins] Inserted DB Record:`, result.rows[0]);

        // Fetch user details to return complete object
        const userResult = await pool.query('SELECT name, avatar_url FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        const newCheckIn = {
            id: result.rows[0].id,
            userId: result.rows[0].user_id,
            userName: user ? user.name : 'Unknown', // Safe user access
            userAvatar: user ? user.avatar_url : '',
            type: result.rows[0].type,
            checkInTime: result.rows[0].timestamp, // Map DB timestamp to frontend checkInTime
            checkOutTime: result.rows[0].check_out_time,
            dailyReport: result.rows[0].daily_report,
            location: result.rows[0].location,
            mood: result.rows[0].mood,
            notes: result.rows[0].notes
        };

        console.log(`[POST /checkins] Returning:`, newCheckIn);

        res.status(201).json(newCheckIn);
    } catch (err) {
        console.error("[POST /checkins] ERROR:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/checkins/:id - Update a check-in (Check-out or Daily Report)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { checkOutTime, dailyReport } = req.body;

    try {
        let query = 'UPDATE check_ins SET ';
        const values = [];
        let valueIndex = 1;

        if (checkOutTime) {
            query += `check_out_time = $${valueIndex}, `;
            values.push(checkOutTime);
            valueIndex++;
        }

        if (dailyReport) {
            query += `daily_report = $${valueIndex}, `;
            values.push(dailyReport);
            valueIndex++;
        }

        // Remove trailing comma and space
        query = query.slice(0, -2);

        query += ` WHERE id = $${valueIndex} RETURNING *`;
        values.push(id);

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Check-in not found' });
        }

        // Fetch user details to return complete object
        const userResult = await pool.query('SELECT name, avatar_url FROM users WHERE id = $1', [result.rows[0].user_id]);
        const user = userResult.rows[0];

        const updatedCheckIn = {
            id: result.rows[0].id,
            userId: result.rows[0].user_id,
            userName: user.name,
            userAvatar: user.avatar_url,
            type: result.rows[0].type,
            checkInTime: result.rows[0].timestamp,
            checkOutTime: result.rows[0].check_out_time,
            dailyReport: result.rows[0].daily_report,
            location: result.rows[0].location,
            mood: result.rows[0].mood,
            notes: result.rows[0].notes
        };

        res.json(updatedCheckIn);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
