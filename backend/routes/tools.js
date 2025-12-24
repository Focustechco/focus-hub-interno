const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// --- Focus Links ---

// GET /api/tools/links - Get all links
router.get('/links', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM focus_links ORDER BY created_at DESC');

        // Map database fields to frontend expected format
        const links = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description || '',
            link: row.url, // Map 'url' to 'link' for frontend
            icon: row.icon || 'Target',
            isFavorite: row.is_favorite || false
        }));

        res.json(links);
    } catch (err) {
        console.error('[GET /tools/links] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/tools/links - Create a link
router.post('/links', async (req, res) => {
    const { title, description, link, url, category, icon, userId } = req.body;
    // Frontend sends 'link', so handle both 'link' and 'url'
    const finalUrl = link || url;

    try {
        const id = 'l' + Date.now();
        const result = await pool.query(
            'INSERT INTO focus_links (id, title, description, url, icon, category, user_id, is_favorite) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [id, title, description || '', finalUrl, icon || 'Target', category, userId, false]
        );

        const row = result.rows[0];
        // Return in frontend expected format
        res.status(201).json({
            id: row.id,
            title: row.title,
            description: row.description || '',
            link: row.url,
            icon: row.icon || 'Target',
            isFavorite: row.is_favorite || false
        });
    } catch (err) {
        console.error('[POST /tools/links] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/tools/links/:id - Update a link
router.put('/links/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, link, url, icon, isFavorite } = req.body;
    const finalUrl = link || url;

    try {
        const result = await pool.query(
            `UPDATE focus_links 
             SET title = COALESCE($1, title), 
                 description = COALESCE($2, description), 
                 url = COALESCE($3, url), 
                 icon = COALESCE($4, icon),
                 is_favorite = COALESCE($5, is_favorite)
             WHERE id = $6 RETURNING *`,
            [title, description, finalUrl, icon, isFavorite, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Link não encontrado' });
        }

        const row = result.rows[0];
        res.json({
            id: row.id,
            title: row.title,
            description: row.description || '',
            link: row.url,
            icon: row.icon || 'Target',
            isFavorite: row.is_favorite || false
        });
    } catch (err) {
        console.error('[PUT /tools/links/:id] Error:', err);
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

        // Map to frontend expected format
        const mappedGroups = await Promise.all(groups.map(async (group) => {
            const credsResult = await pool.query('SELECT * FROM access_credentials WHERE group_id = $1', [group.id]);

            // Map credentials to frontend expected format (links)
            const links = credsResult.rows.map(cred => ({
                id: cred.id,
                nome: cred.service_name,
                link: cred.url || '',
                icon: 'LinkIcon',
                descricao: cred.notes || '',
                login: cred.username || '',
                senha: cred.password || '',
                isFavorite: cred.is_favorite || false
            }));

            return {
                id: group.id,
                name: group.name,
                links: links
            };
        }));

        res.json(mappedGroups);
    } catch (err) {
        console.error('[GET /access-groups] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/tools/access-groups - Create a group
router.post('/access-groups', async (req, res) => {
    const { title, description, category } = req.body;
    try {
        const id = 'ag' + Date.now();
        // Use 'title' from frontend but store as 'name' in DB
        const result = await pool.query(
            'INSERT INTO access_groups (id, name, description, category) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, title, description, category]
        );
        const newGroup = result.rows[0];

        // Return in frontend expected format
        res.status(201).json({
            id: newGroup.id,
            name: newGroup.name,
            title: newGroup.name, // Also include title for compatibility
            links: []
        });
    } catch (err) {
        console.error('[POST /access-groups] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/tools/access-groups/:id - Update a group
router.put('/access-groups/:id', async (req, res) => {
    const { id } = req.params;
    const { name, title, description, category } = req.body;
    const finalName = name || title;

    try {
        const result = await pool.query(
            `UPDATE access_groups 
             SET name = COALESCE($1, name), 
                 description = COALESCE($2, description), 
                 category = COALESCE($3, category)
             WHERE id = $4 RETURNING *`,
            [finalName, description, category, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Grupo não encontrado' });
        }

        res.json({
            id: result.rows[0].id,
            name: result.rows[0].name,
            links: [] // Simplified - caller should refetch if needed
        });
    } catch (err) {
        console.error('[PUT /access-groups/:id] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/tools/access-groups/:id - Delete a group (cascade deletes credentials)
router.delete('/access-groups/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM access_groups WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Grupo não encontrado' });
        }
        res.json({ message: 'Grupo deletado', id });
    } catch (err) {
        console.error('[DELETE /access-groups/:id] Error:', err);
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

// PUT /api/tools/credentials/:id - Update credential
router.put('/credentials/:id', async (req, res) => {
    const { id } = req.params;
    const { serviceName, username, password, url, notes, isFavorite } = req.body;

    try {
        const result = await pool.query(
            `UPDATE access_credentials 
             SET service_name = COALESCE($1, service_name), 
                 username = COALESCE($2, username), 
                 password = COALESCE($3, password),
                 url = COALESCE($4, url),
                 notes = COALESCE($5, notes),
                 is_favorite = COALESCE($6, is_favorite)
             WHERE id = $7 RETURNING *`,
            [serviceName, username, password, url, notes, isFavorite, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Credencial não encontrada' });
        }

        const cred = result.rows[0];
        res.json({
            id: cred.id,
            nome: cred.service_name,
            link: cred.url || '',
            icon: 'LinkIcon',
            descricao: cred.notes || '',
            login: cred.username || '',
            senha: cred.password || '',
            isFavorite: cred.is_favorite || false
        });
    } catch (err) {
        console.error('[PUT /credentials/:id] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/tools/credentials/:id - Delete credential
router.delete('/credentials/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM access_credentials WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Credencial não encontrada' });
        }
        res.json({ message: 'Credencial deletada', id });
    } catch (err) {
        console.error('[DELETE /credentials/:id] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

