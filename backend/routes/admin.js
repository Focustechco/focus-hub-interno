const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// All admin routes require auth + admin
router.use(authMiddleware);
router.use(adminOnly);

// GET /api/admin/dashboard — Aggregated KPIs
router.get('/dashboard', async (req, res) => {
    try {
        const queries = await Promise.all([
            // Users
            pool.query('SELECT COUNT(*) as total FROM users'),
            pool.query("SELECT COUNT(*) as total FROM users WHERE status = 'active' OR status IS NULL"),
            pool.query("SELECT COUNT(*) as total FROM users WHERE status = 'archived'"),
            pool.query("SELECT COUNT(*) as total FROM users WHERE role = 'ADMIN'"),
            pool.query("SELECT COUNT(*) as total FROM users WHERE role = 'USER'"),
            pool.query("SELECT COUNT(*) as total FROM users WHERE role = 'COLLABORATOR'"),
            // Sectors
            pool.query('SELECT DISTINCT sector FROM users WHERE sector IS NOT NULL'),
            // Tasks
            pool.query('SELECT COUNT(*) as total FROM tasks'),
            pool.query("SELECT COUNT(*) as total FROM tasks WHERE status = 'concluida'"),
            pool.query("SELECT COUNT(*) as total FROM tasks WHERE status = 'pendente'"),
            pool.query("SELECT COUNT(*) as total FROM tasks WHERE status = 'em_progresso'"),
            // Goals
            pool.query("SELECT COUNT(*) as total FROM goals"),
            pool.query("SELECT COUNT(*) as total FROM goals WHERE status = 'active' OR status = 'em_andamento'"),
            // Posts
            pool.query('SELECT COUNT(*) as total FROM posts'),
            // Notifications
            pool.query('SELECT COUNT(*) as total FROM notifications WHERE is_read = false'),
            // Google Calendar
            pool.query('SELECT COUNT(*) as total FROM google_calendar_events WHERE start_time > NOW()').catch(() => ({ rows: [{ total: 0 }] })),
            // Google Integration
            pool.query('SELECT COUNT(*) as total FROM google_corporate_integration').catch(() => ({ rows: [{ total: 0 }] })),
            // Drive storage
            pool.query("SELECT COUNT(*) as total FROM drive_folder_permissions").catch(() => ({ rows: [{ total: 0 }] })),
            // Users by sector
            pool.query('SELECT sector, COUNT(*) as count FROM users WHERE sector IS NOT NULL GROUP BY sector ORDER BY count DESC'),
            // Tasks by sector  
            pool.query('SELECT sector, COUNT(*) as count FROM tasks WHERE sector IS NOT NULL GROUP BY sector ORDER BY count DESC'),
            // Recent activity (audit)
            pool.query('SELECT COUNT(*) as total FROM audit_logs').catch(() => ({ rows: [{ total: 0 }] })),
        ]);

        const dashboard = {
            users: {
                total: parseInt(queries[0].rows[0].total),
                active: parseInt(queries[1].rows[0].total),
                archived: parseInt(queries[2].rows[0].total),
                admins: parseInt(queries[3].rows[0].total),
                regular: parseInt(queries[4].rows[0].total),
                collaborators: parseInt(queries[5].rows[0].total),
            },
            sectors: {
                total: queries[6].rows.length,
                list: queries[6].rows.map(r => r.sector),
            },
            tasks: {
                total: parseInt(queries[7].rows[0].total),
                completed: parseInt(queries[8].rows[0].total),
                pending: parseInt(queries[9].rows[0].total),
                inProgress: parseInt(queries[10].rows[0].total),
            },
            goals: {
                total: parseInt(queries[11].rows[0].total),
                active: parseInt(queries[12].rows[0].total),
            },
            posts: {
                total: parseInt(queries[13].rows[0].total),
            },
            notifications: {
                unread: parseInt(queries[14].rows[0].total),
            },
            agenda: {
                upcomingEvents: parseInt(queries[15].rows[0].total),
            },
            integrations: {
                google: parseInt(queries[16].rows[0].total) > 0,
                drivePermissions: parseInt(queries[17].rows[0].total),
            },
            charts: {
                usersBySector: queries[18].rows.map(r => ({ sector: r.sector, count: parseInt(r.count) })),
                tasksBySector: queries[19].rows.map(r => ({ sector: r.sector, count: parseInt(r.count) })),
            },
            audit: {
                totalLogs: parseInt(queries[20].rows[0].total),
            },
            system: {
                uptime: Math.floor(process.uptime()),
                nodeVersion: process.version,
                memoryUsage: process.memoryUsage(),
                timestamp: new Date().toISOString(),
            }
        };

        res.json(dashboard);
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: 'Falha ao carregar dashboard administrativo' });
    }
});

// GET /api/admin/users — Expanded user list with stats
router.get('/users', async (req, res) => {
    try {
        const usersResult = await pool.query(`
            SELECT 
                u.id, u.name, u.email, u.whatsapp, u.role, u.avatar_url, u.sector, 
                u.job_title, u.bio, u.join_date, u.status, u.is_approved, u.created_at,
                (SELECT COUNT(*) FROM tasks WHERE assignee_id = u.id) as task_count,
                (SELECT COUNT(*) FROM tasks WHERE assignee_id = u.id AND status = 'concluida') as completed_tasks,
                (SELECT COUNT(*) FROM goals WHERE responsible_id = u.id) as goal_count,
                (SELECT COUNT(*) FROM posts WHERE author_id = u.id) as post_count,
                (SELECT MAX(timestamp) FROM check_ins WHERE user_id = u.id) as last_checkin
            FROM users u
            ORDER BY u.name ASC
        `);

        res.json(usersResult.rows);
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Falha ao carregar lista de usuários' });
    }
});

// PUT /api/admin/users/:id/status — Change user status
router.put('/users/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active', 'archived', 'suspended', 'blocked'

        if (!['active', 'archived', 'suspended', 'blocked'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }

        await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);

        // Audit log
        await pool.query(
            'INSERT INTO audit_logs (user_id, user_name, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
            [req.user.id, 'Admin', 'UPDATE_STATUS', 'user', id, JSON.stringify({ newStatus: status })]
        ).catch(() => {});

        res.json({ success: true, status });
    } catch (error) {
        console.error('Admin status update error:', error);
        res.status(500).json({ error: 'Falha ao atualizar status do usuário' });
    }
});

// POST /api/admin/users/:id/reset-password — Admin reset password
router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, id]);

        // Audit log
        await pool.query(
            'INSERT INTO audit_logs (user_id, user_name, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
            [req.user.id, 'Admin', 'RESET_PASSWORD', 'user', id, JSON.stringify({ resetBy: req.user.id })]
        ).catch(() => {});

        res.json({ success: true });
    } catch (error) {
        console.error('Admin password reset error:', error);
        res.status(500).json({ error: 'Falha ao redefinir senha' });
    }
});

// GET /api/admin/audit — Audit logs
router.get('/audit', async (req, res) => {
    try {
        const { page = 1, limit = 50, userId, action, resourceType } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = 'SELECT * FROM audit_logs WHERE 1=1';
        let params = [];
        let paramIndex = 1;

        if (userId) {
            query += ` AND user_id = $${paramIndex++}`;
            params.push(userId);
        }
        if (action) {
            query += ` AND action = $${paramIndex++}`;
            params.push(action);
        }
        if (resourceType) {
            query += ` AND resource_type = $${paramIndex++}`;
            params.push(resourceType);
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);
        const countResult = await pool.query('SELECT COUNT(*) as total FROM audit_logs');

        res.json({
            logs: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Admin audit error:', error);
        res.status(500).json({ error: 'Falha ao carregar logs de auditoria' });
    }
});

// GET /api/admin/system — System monitoring
router.get('/system', async (req, res) => {
    try {
        const mem = process.memoryUsage();
        const dbCheck = await pool.query('SELECT NOW() as time, version() as version');

        res.json({
            uptime: Math.floor(process.uptime()),
            nodeVersion: process.version,
            memory: {
                rss: Math.round(mem.rss / 1024 / 1024),
                heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                external: Math.round(mem.external / 1024 / 1024),
            },
            database: {
                connected: true,
                time: dbCheck.rows[0].time,
                version: dbCheck.rows[0].version,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.json({
            uptime: Math.floor(process.uptime()),
            database: { connected: false },
            error: error.message,
        });
    }
});

// --- PHASE 2: SECTORS, MODULES, PERMISSIONS ---

// GET /api/admin/sectors
router.get('/sectors', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sectors ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Admin sectors error:', error);
        res.status(500).json({ error: 'Falha ao carregar setores' });
    }
});

// POST /api/admin/sectors
router.post('/sectors', async (req, res) => {
    try {
        const { id, name, color, description, manager_id } = req.body;
        const result = await pool.query(
            'INSERT INTO sectors (id, name, color, description, manager_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, name, color, description, manager_id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Admin create sector error:', error);
        res.status(500).json({ error: 'Falha ao criar setor' });
    }
});

// PUT /api/admin/sectors/:id
router.put('/sectors/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color, description, manager_id } = req.body;
        const result = await pool.query(
            'UPDATE sectors SET name = $1, color = $2, description = $3, manager_id = $4 WHERE id = $5 RETURNING *',
            [name, color, description, manager_id, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Admin update sector error:', error);
        res.status(500).json({ error: 'Falha ao atualizar setor' });
    }
});

// DELETE /api/admin/sectors/:id
router.delete('/sectors/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM sectors WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Admin delete sector error:', error);
        res.status(500).json({ error: 'Falha ao excluir setor' });
    }
});

// GET /api/admin/modules
router.get('/modules', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_modules ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Falha ao carregar módulos' });
    }
});

// PUT /api/admin/modules/:slug/toggle
router.put('/modules/:slug/toggle', async (req, res) => {
    try {
        const { slug } = req.params;
        const { is_active } = req.body;
        const result = await pool.query(
            'UPDATE system_modules SET is_active = $1 WHERE slug = $2 RETURNING *',
            [is_active, slug]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Falha ao atualizar módulo' });
    }
});

// GET /api/admin/permissions
router.get('/permissions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM role_permissions');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Falha ao carregar permissões' });
    }
});

// PUT /api/admin/permissions
router.put('/permissions', async (req, res) => {
    try {
        const { role, module_slug, can_view, can_create, can_edit, can_delete, can_admin } = req.body;
        const result = await pool.query(`
            INSERT INTO role_permissions (role, module_slug, can_view, can_create, can_edit, can_delete, can_admin)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (role, module_slug) DO UPDATE SET
                can_view = EXCLUDED.can_view,
                can_create = EXCLUDED.can_create,
                can_edit = EXCLUDED.can_edit,
                can_delete = EXCLUDED.can_delete,
                can_admin = EXCLUDED.can_admin
            RETURNING *
        `, [role, module_slug, can_view, can_create, can_edit, can_delete, can_admin]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Admin update permissions error:', error);
        res.status(500).json({ error: 'Falha ao atualizar permissões' });
    }
});

// --- PHASE 3: INTEGRATIONS & COMMUNICATION ---

// GET /api/admin/integrations/status
router.get('/integrations/status', async (req, res) => {
    try {
        const statuses = [];

        // 1. Google Workspace (Calendar/Drive)
        try {
            const googleRes = await pool.query('SELECT connected_by, connected_at, last_sync_at, sync_status, google_email FROM google_corporate_integration LIMIT 1');
            if (googleRes.rows.length > 0) {
                const g = googleRes.rows[0];
                statuses.push({
                    id: 'google',
                    name: 'Google Workspace',
                    description: 'Calendar & Drive sync',
                    status: g.sync_status === 'ok' || g.sync_status === 'success' ? 'connected' : 'error',
                    details: g.google_email,
                    lastSync: g.last_sync_at,
                    connectedAt: g.connected_at
                });
            } else {
                statuses.push({ id: 'google', name: 'Google Workspace', description: 'Calendar & Drive sync', status: 'disconnected' });
            }
        } catch (e) {
            statuses.push({ id: 'google', name: 'Google Workspace', status: 'error', details: e.message });
        }

        // 2. Discord
        try {
            const discordRes = await pool.query('SELECT connected_by, connected_at FROM discord_integration LIMIT 1');
            if (discordRes.rows.length > 0) {
                statuses.push({
                    id: 'discord',
                    name: 'Discord',
                    description: 'Bot notifications',
                    status: 'connected',
                    connectedAt: discordRes.rows[0].connected_at
                });
            } else {
                statuses.push({ id: 'discord', name: 'Discord', description: 'Bot notifications', status: 'disconnected' });
            }
        } catch (e) {
            statuses.push({ id: 'discord', name: 'Discord', status: 'error', details: e.message });
        }

        // 3. WhatsApp (via existing baileys session logic)
        try {
            // We just check if whatsapp is running by checking if the service is exported/initialized
            // A real check would query the whatsapp service status
            const fs = require('fs');
            const path = require('path');
            const hasSession = fs.existsSync(path.join(__dirname, '..', 'whatsapp-auth'));
            statuses.push({
                id: 'whatsapp',
                name: 'WhatsApp',
                description: 'Baileys Multi-device',
                status: hasSession ? 'connected' : 'disconnected',
                details: hasSession ? 'Sessão ativa' : 'Aguardando QR Code'
            });
        } catch (e) {
            statuses.push({ id: 'whatsapp', name: 'WhatsApp', status: 'error' });
        }

        // 4. Web Push
        try {
            const pushRes = await pool.query('SELECT COUNT(*) as total FROM push_subscriptions');
            statuses.push({
                id: 'push',
                name: 'Notificações Push',
                description: 'Navegador / PWA',
                status: 'connected',
                details: `${pushRes.rows[0].total} inscrições ativas`
            });
        } catch (e) {
            statuses.push({ id: 'push', name: 'Notificações Push', status: 'error' });
        }

        res.json(statuses);
    } catch (error) {
        console.error('Admin integrations status error:', error);
        res.status(500).json({ error: 'Falha ao carregar status das integrações' });
    }
});

// POST /api/admin/communication/send
router.post('/communication/send', async (req, res) => {
    try {
        const { target, sector, title, message, channels } = req.body;
        // target: 'all', 'sector', 'admins'
        // channels: ['in-app', 'push', 'whatsapp']

        let userIds = [];

        if (target === 'all') {
            const usersRes = await pool.query("SELECT id FROM users WHERE status = 'active' OR status IS NULL");
            userIds = usersRes.rows.map(r => r.id);
        } else if (target === 'sector' && sector) {
            const usersRes = await pool.query("SELECT id FROM users WHERE sector = $1 AND (status = 'active' OR status IS NULL)", [sector]);
            userIds = usersRes.rows.map(r => r.id);
        } else if (target === 'admins') {
            const usersRes = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' AND (status = 'active' OR status IS NULL)");
            userIds = usersRes.rows.map(r => r.id);
        }

        if (userIds.length === 0) {
            return res.status(400).json({ error: 'Nenhum usuário encontrado para o alvo selecionado' });
        }

        // 1. In-App Notifications
        if (channels.includes('in-app')) {
            const values = userIds.map((id, index) => `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`).join(', ');
            const params = userIds.flatMap(id => [id, 'SYSTEM_ALERT', message]);
            if (params.length > 0) {
                await pool.query(`INSERT INTO notifications (user_id, type, message) VALUES ${values}`, params);
            }
        }

        // 2. Web Push & WhatsApp 
        // Em um cenário real, chamamos o pushService e whatsappService
        // Aqui apenas registramos no log de auditoria
        
        await pool.query(
            'INSERT INTO audit_logs (user_id, user_name, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
            [req.user.id, 'Admin', 'MASS_COMMUNICATION', 'system', target, JSON.stringify({ title, channels, sentCount: userIds.length })]
        ).catch(() => {});

        res.json({ success: true, sentCount: userIds.length });
    } catch (error) {
        console.error('Admin mass communication error:', error);
        res.status(500).json({ error: 'Falha ao enviar comunicação' });
    }
});

module.exports = router;
