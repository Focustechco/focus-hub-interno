const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Helper to calculate progress
const calculateProgress = (current, target) => {
    return target > 0 ? (Number(current) / Number(target)) * 100 : 0;
};

// GET /api/goals - Get all goals
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM goals ORDER BY created_at DESC');
        const goals = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            sector: row.sector,
            responsible_id: row.responsible_id,
            team: row.team,
            start_date: row.start_date,
            end_date: row.end_date,
            target_value: Number(row.target_value),
            current_value: Number(row.current_value),
            progress: calculateProgress(row.current_value, row.target_value),
            metric: row.metric,
            category: row.category,
            scope: row.scope,
            priority: row.priority,
            status: row.status,
            color: row.color,
            weight: row.weight,
            allow_overflow: row.allow_overflow,
            observations: row.observations,
            created_by: row.created_by,
            created_at: row.created_at,
            subgoals: row.subgoals || []
        }));
        res.json(goals);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/goals - Create a new goal
router.post('/', async (req, res) => {
    const data = req.body;
    const userId = req.user ? req.user.id : data.created_by;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const id = 'g' + Date.now();
        const result = await pool.query(
            `INSERT INTO goals (
                id, title, description, sector, responsible_id, team, start_date, end_date, 
                target_value, current_value, metric, category, scope, priority, status, 
                color, weight, allow_overflow, observations, created_by, subgoals
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
            ) RETURNING *`,
            [
                id, data.title, data.description, data.sector || 'Comercial', data.responsible_id || null, data.team || null,
                data.start_date || null, data.end_date || null, data.target_value || 0, data.current_value || 0,
                data.metric || 'count', data.category || 'quantity', data.scope || 'individual', data.priority || 'medium',
                data.status || 'active', data.color || '#FF6B00', data.weight || 1, data.allow_overflow || false,
                data.observations || null, userId, JSON.stringify(data.subgoals || [])
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/goals/:id - Update a goal
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const userId = req.user ? req.user.id : null;

    try {
        let query = 'UPDATE goals SET ';
        const values = [];
        let valueIndex = 1;
        
        // Remove id and calculated fields from update
        delete data.id;
        delete data.progress;
        delete data.created_at;

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                query += `${key} = $${valueIndex}, `;
                values.push(key === 'subgoals' ? JSON.stringify(value) : value);
                valueIndex++;
            }
        }

        if (values.length === 0) return res.json({ message: 'No fields to update' });

        query = query.slice(0, -2);
        query += ` WHERE id = $${valueIndex} RETURNING *`;
        values.push(id);

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Goal not found' });
        }

        // Log history
        if (userId) {
            await pool.query(
                `INSERT INTO goal_history (id, goal_id, user_id, action, details) VALUES ($1, $2, $3, $4, $5)`,
                ['gh-' + Date.now(), id, userId, 'UPDATED', JSON.stringify(data)]
            );
        }

        res.json(result.rows[0]);
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
