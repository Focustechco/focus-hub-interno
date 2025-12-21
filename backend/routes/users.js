const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/users - Get all users
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, avatar_url, sector, job_title, bio, join_date FROM users ORDER BY name ASC');

        const users = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role ? row.role.toUpperCase() : 'USER',
            avatarUrl: row.avatar_url,
            sector: row.sector,
            jobTitle: row.job_title,
            bio: row.bio,
            joinDate: row.join_date
        }));

        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/users/:id - Update a user (including avatar)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, role, sector, jobTitle, bio, avatarUrl } = req.body;

    console.log('[PUT /users/:id] Updating user:', id);
    console.log('[PUT /users/:id] Has avatarUrl:', !!avatarUrl);

    try {
        const result = await pool.query(
            `UPDATE users 
             SET name = $1, role = $2, sector = $3, job_title = $4, bio = $5, avatar_url = $6
             WHERE id = $7
             RETURNING id, name, email, role, avatar_url, sector, job_title, bio, join_date`,
            [name, role, sector, jobTitle, bio, avatarUrl, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const row = result.rows[0];
        const updatedUser = {
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role ? row.role.toUpperCase() : 'USER',
            avatarUrl: row.avatar_url,
            sector: row.sector,
            jobTitle: row.job_title,
            bio: row.bio,
            joinDate: row.join_date
        };

        console.log('[PUT /users/:id] User updated successfully:', id);
        res.json(updatedUser);
    } catch (err) {
        console.error('[PUT /users/:id] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
