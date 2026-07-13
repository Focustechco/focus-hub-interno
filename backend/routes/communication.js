const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/communication/dashboard/birthdays
router.get('/dashboard/birthdays', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT id, name, avatar_url, job_title, sector, birth_date
            FROM users
            WHERE birth_date IS NOT NULL
            AND (
                (EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM birth_date) >= EXTRACT(DAY FROM CURRENT_DATE))
                OR
                (EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '7 days') AND EXTRACT(DAY FROM birth_date) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '7 days'))
            )
            ORDER BY EXTRACT(MONTH FROM birth_date), EXTRACT(DAY FROM birth_date)
            LIMIT 10
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// GET /api/communication/dashboard/new-hires
router.get('/dashboard/new-hires', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT id, name, avatar_url, job_title, sector, join_date
            FROM users
            WHERE join_date >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY join_date DESC
            LIMIT 5
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// --- FASE 2: Mural de Avisos ---

router.get('/announcements', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT a.*, u.name as author_name, u.avatar_url as author_avatar, u.job_title as author_role, u.sector as author_sector,
                   (SELECT json_agg(json_build_object('type', reaction_type, 'count', count)) FROM (SELECT reaction_type, count(*) FROM announcement_reactions WHERE announcement_id = a.id GROUP BY reaction_type) r) as reactions
            FROM announcements a
            JOIN users u ON a.author_id = u.id
            ORDER BY a.pinned DESC, a.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

router.post('/announcements', async (req, res, next) => {
    try {
        const { title, content, priority, expires_at, pinned, attachments } = req.body;
        const author_id = req.user.id;
        const id = `ann-${Date.now()}`;

        const result = await pool.query(`
            INSERT INTO announcements (id, title, content, author_id, priority, expires_at, pinned, attachments)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [id, title, content, author_id, priority || 'Normal', expires_at || null, pinned || false, attachments ? JSON.stringify(attachments) : null]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

router.post('/announcements/:id/reactions', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reaction_type } = req.body;
        const user_id = req.user.id;

        const existing = await pool.query('SELECT * FROM announcement_reactions WHERE announcement_id = $1 AND user_id = $2 AND reaction_type = $3', [id, user_id, reaction_type]);
        
        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM announcement_reactions WHERE id = $1', [existing.rows[0].id]);
            res.json({ message: 'Reaction removed' });
        } else {
            const reactionId = `reac-${Date.now()}`;
            await pool.query('INSERT INTO announcement_reactions (id, announcement_id, user_id, reaction_type) VALUES ($1, $2, $3, $4)', [reactionId, id, user_id, reaction_type]);
            res.status(201).json({ message: 'Reaction added' });
        }
    } catch (error) {
        next(error);
    }
});

// --- FASE 3: Canais e Contatos ---

// GET /api/communication/channels
router.get('/channels', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM corporate_channels ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/communication/channels (Admin only ideally, but we allow for now)
router.post('/channels', async (req, res, next) => {
    try {
        const { name, description, type, url, department, icon } = req.body;
        const id = `chan-${Date.now()}`;
        
        const result = await pool.query(`
            INSERT INTO corporate_channels (id, name, description, type, url, department, icon)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [id, name, description, type, url, department, icon]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/communication/channels/:id
router.delete('/channels/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM corporate_channels WHERE id = $1', [id]);
        res.json({ message: 'Channel deleted' });
    } catch (error) {
        next(error);
    }
});

// GET /api/communication/contacts
router.get('/contacts', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT id, name, email, whatsapp, phone, avatar_url, job_title, sector, role 
            FROM users 
            ORDER BY name ASC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
