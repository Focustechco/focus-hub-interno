const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- Focus Links ---

// GET /api/tools/links - Get all links
router.get('/links', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM focus_links ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/tools/links - Create a link
router.post('/links', async (req, res) => {
    const { title, url, category, icon, userId } = req.body;
    try {
        const id = 'l' + Date.now();
        const result = await pool.query(
            'INSERT INTO focus_links (id, title, url, category, icon, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [id, title, url, category, icon, userId]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/tools/links/:id - Delete a link
router.delete('/links/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM focus_links WHERE id = $1', [id]);
        res.json({ message: 'Link deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Access Groups ---

// GET /api/tools/access-groups - Get all groups with credentials
router.get('/access-groups', async (req, res) => {
    try {
        const groupsResult = await pool.query('SELECT * FROM access_groups ORDER BY created_at DESC');
        const groups = groupsResult.rows;

        for (let group of groups) {
            const credsResult = await pool.query('SELECT * FROM access_credentials WHERE group_id = $1', [group.id]);
            group.credentials = credsResult.rows;
        }

        res.json(groups);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/tools/access-groups - Create a group
router.post('/access-groups', async (req, res) => {
    const { title, description, category } = req.body;
    try {
        const id = 'ag' + Date.now();
        const result = await pool.query(
            'INSERT INTO access_groups (id, title, description, category) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, title, description, category]
        );
        const newGroup = result.rows[0];
        newGroup.credentials = [];
        res.status(201).json(newGroup);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/tools/access-groups/:id/credentials - Add credential
router.post('/access-groups/:id/credentials', async (req, res) => {
    const { id: groupId } = req.params;
    const { serviceName, username, password, url, notes } = req.body;
    try {
        const id = 'ac' + Date.now();
        const result = await pool.query(
            'INSERT INTO access_credentials (id, group_id, service_name, username, password, url, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [id, groupId, serviceName, username, password, url, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
