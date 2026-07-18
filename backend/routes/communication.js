const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../storage/avatars'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.use(authMiddleware);

// GET /api/communication/dashboard/birthdays
router.get('/dashboard/birthdays', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT id, name, avatar_url, job_title, sector, birth_date
            FROM users
            WHERE birth_date IS NOT NULL
            ORDER BY 
                CASE 
                    WHEN EXTRACT(MONTH FROM birth_date) < EXTRACT(MONTH FROM CURRENT_DATE) THEN 1
                    WHEN EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(DAY FROM birth_date) < EXTRACT(DAY FROM CURRENT_DATE) THEN 1
                    ELSE 0
                END,
                EXTRACT(MONTH FROM birth_date), 
                EXTRACT(DAY FROM birth_date)
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

router.put('/announcements/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, content, priority } = req.body;
        const result = await pool.query(`
            UPDATE announcements
            SET title = $1, content = $2, priority = $3
            WHERE id = $4
            RETURNING *
        `, [title, content, priority, id]);
        
        if (result.rowCount === 0) return res.status(404).json({ message: 'Aviso não encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

router.delete('/announcements/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM announcement_reactions WHERE announcement_id = $1', [id]);
        await pool.query('DELETE FROM announcement_comments WHERE announcement_id = $1', [id]);
        const result = await pool.query('DELETE FROM announcements WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Aviso não encontrado' });
        res.json({ message: 'Aviso excluído' });
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
            SELECT id, name, email, whatsapp, avatar_url, job_title, sector, role, birth_date
            FROM users 
            ORDER BY name ASC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/communication/upload-avatar
router.post('/upload-avatar', upload.single('avatar'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado' });
        }
        // Retornar a URL absoluta para salvar no banco
        const avatarUrl = `${req.protocol}://${req.get('host')}/storage/avatars/${req.file.filename}`;
        res.status(201).json({ avatar_url: avatarUrl });
    } catch (error) {
        next(error);
    }
});

// POST /api/communication/contacts
router.post('/contacts', async (req, res, next) => {
    try {
        const { name, email, job_title, sector, role, whatsapp, birth_date, avatar_url } = req.body;
        const id = `u${Date.now()}`;
        const finalRole = role || 'user';
        const finalEmail = email || `${id}@focus.com`; // dummy email if not provided
        
        const result = await pool.query(`
            INSERT INTO users (id, name, email, role, job_title, sector, whatsapp, birth_date, avatar_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, name, email, whatsapp, job_title, sector, role, birth_date, avatar_url
        `, [id, name, finalEmail, finalRole, job_title, sector, whatsapp, birth_date || null, avatar_url || null]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// PUT /api/communication/contacts/:id
router.put('/contacts/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, job_title, sector, role, whatsapp, birth_date, avatar_url } = req.body;
        const finalRole = role || 'user';
        
        const result = await pool.query(`
            UPDATE users 
            SET name = $1, email = COALESCE($2, email), role = $3, job_title = $4, sector = $5, whatsapp = $6, birth_date = $7, avatar_url = $8
            WHERE id = $9
            RETURNING id, name, email, whatsapp, job_title, sector, role, birth_date, avatar_url
        `, [name, email, finalRole, job_title, sector, whatsapp, birth_date || null, avatar_url || null, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Contato não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

router.delete('/contacts/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Manual cascade deletes
        await pool.query('DELETE FROM push_subscriptions WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM daily_checklist WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM check_ins WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM focus_links WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM notifications WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM announcement_reactions WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM announcement_comments WHERE user_id = $1', [id]);
        await pool.query('DELETE FROM announcements WHERE author_id = $1', [id]);
        await pool.query('DELETE FROM posts WHERE author_id = $1', [id]);
        await pool.query('DELETE FROM goals WHERE user_id = $1', [id]);
        await pool.query('UPDATE tasks SET assignee_id = NULL WHERE assignee_id = $1', [id]);

        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Contato não encontrado' });
        }
        
        res.json({ message: 'Contato excluído com sucesso' });
    } catch (error) {
        next(error);
    }
});

// GET /api/communication/achievements
router.get('/achievements', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT a.*, 
                   u.name as awarded_to_name, u.avatar_url as awarded_to_avatar,
                   c.name as created_by_name, c.avatar_url as created_by_avatar
            FROM achievements a
            LEFT JOIN users u ON a.awarded_to = u.id
            LEFT JOIN users c ON a.created_by = c.id
            ORDER BY a.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/communication/achievements
router.post('/achievements', async (req, res, next) => {
    try {
        const { title, description, icon, awarded_to } = req.body;
        const id = `ach-${Date.now()}`;
        const created_by = req.user.id;
        
        const result = await pool.query(`
            INSERT INTO achievements (id, title, description, icon, awarded_to, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [id, title, description, icon || 'Trophy', awarded_to || null, created_by]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// PUT /api/communication/achievements/:id
router.put('/achievements/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, icon, awarded_to } = req.body;
        
        const result = await pool.query(`
            UPDATE achievements 
            SET title = $1, description = $2, icon = $3, awarded_to = $4
            WHERE id = $5
            RETURNING *
        `, [title, description, icon, awarded_to || null, id]);
        
        if (result.rowCount === 0) return res.status(404).json({ message: 'Conquista não encontrada' });
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/communication/achievements/:id
router.delete('/achievements/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM achievements WHERE id = $1 RETURNING id', [id]);
        
        if (result.rowCount === 0) return res.status(404).json({ message: 'Conquista não encontrada' });
        res.json({ message: 'Conquista excluída' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
