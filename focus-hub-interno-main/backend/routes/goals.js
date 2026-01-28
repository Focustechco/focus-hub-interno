const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/goals - Get all goals
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM goals ORDER BY created_at DESC');

        const goals = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            // progress is not in DB, calculate it or remove if frontend calculates it.
            // But frontend typically expects it or calculates it. Let's send 0 if not present.
            progress: row.target_value > 0 ? (row.current_value / row.target_value) * 100 : 0,
            current: row.current_value,
            target: row.target_value,
            metric: row.metric,
            status: row.status,
            dueDate: row.due_date,
            sector: row.sector,
            period: row.period,
            type: row.type,
            userId: row.user_id,
            isMonthlyHighlight: row.is_monthly_highlight
        }));
        res.json(goals);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/goals - Create a new goal
router.post('/', async (req, res) => {
    const { title, description, progress, current, target, metric, status, dueDate, sector, period, type, userId: bodyUserId } = req.body;

    // Use userId from auth token (req.user is populated by authMiddleware)
    // Fallback to bodyUserId only if strictly necessary (e.g. admin creating for others), but for now default to authenticated user.
    const userId = req.user ? req.user.id : bodyUserId;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const id = 'g' + Date.now();
        // Provide defaults for required fields to prevent null constraint violations
        const finalType = type || 'individual';
        const finalStatus = status || 'active';
        const finalMetric = metric || 'BRL';
        const finalPeriod = period || 'monthly';
        const finalSector = sector || 'Comercial';

        const result = await pool.query(
            `INSERT INTO goals (id, title, description, current_value, target_value, metric, status, due_date, sector, period, type, user_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
             RETURNING *`,
            [id, title, description, current || 0, target || 0, finalMetric, finalStatus, dueDate, finalSector, finalPeriod, finalType, userId]
        );

        const newGoal = {
            id: result.rows[0].id,
            title: result.rows[0].title,
            description: result.rows[0].description,
            progress: result.rows[0].target_value > 0 ? (result.rows[0].current_value / result.rows[0].target_value) * 100 : 0,
            current: result.rows[0].current_value,
            target: result.rows[0].target_value,
            metric: result.rows[0].metric,
            status: result.rows[0].status,
            dueDate: result.rows[0].due_date,
            sector: result.rows[0].sector,
            period: result.rows[0].period,
            type: result.rows[0].type,
            userId: result.rows[0].user_id
        };

        res.status(201).json(newGoal);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/goals/:id - Update a goal
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, progress, current, target, status, dueDate, sector } = req.body;

    try {
        // Build dynamic query
        let query = 'UPDATE goals SET ';
        const values = [];
        let valueIndex = 1;

        const fields = { title, description, progress, current_value: current, target_value: target, status, due_date: dueDate, sector };

        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) {
                query += `${key} = $${valueIndex}, `;
                values.push(value);
                valueIndex++;
            }
        }

        // Remove trailing comma and space
        query = query.slice(0, -2);

        query += ` WHERE id = $${valueIndex} RETURNING *`;
        values.push(id);

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        const updatedGoal = {
            id: result.rows[0].id,
            title: result.rows[0].title,
            description: result.rows[0].description,
            progress: result.rows[0].progress, // Keep for backward compatibility if needed, but current/target is better
            current: result.rows[0].current_value,
            target: result.rows[0].target_value,
            metric: result.rows[0].metric, // Ensure metric is returned
            status: result.rows[0].status,
            dueDate: result.rows[0].due_date,
            sector: result.rows[0].sector,
            period: result.rows[0].period,
            type: result.rows[0].type
        };

        res.json(updatedGoal);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/goals/:id - Delete a goal
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM goals WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Goal not found' });
        }
        res.json({ message: 'Goal deleted', id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
