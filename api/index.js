import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_at_least_32_chars_long_for_security_reasons';
}

const { pool } = require('../backend/config/db');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const { authMiddleware } = require('../backend/middleware/auth');

const authRoutes = require('../backend/routes/auth');
const tasksRoutes = require('../backend/routes/tasks');
const checkinsRoutes = require('../backend/routes/checkins');
const postsRoutes = require('../backend/routes/posts');
const goalsRoutes = require('../backend/routes/goals');
const usersRoutes = require('../backend/routes/users');
const toolsRoutes = require('../backend/routes/tools');
const reportsRoutes = require('../backend/routes/reports');
const checklistRoutes = require('../backend/routes/dailyChecklist');
const notificationsRoutes = require('../backend/routes/notifications');
const pushRoutes = require('../backend/routes/push');
const contentsRoutes = require('../backend/routes/contents');
const driveRoutes = require('../backend/routes/drive');
const communicationRoutes = require('../backend/routes/communication');
const agendaRoutes = require('../backend/routes/agenda');
const adminRoutes = require('../backend/routes/admin');
const googleRoutes = require('../backend/routes/google');

// Mount routes for both /api/path and /path
['/api', ''].forEach(prefix => {
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/google`, googleRoutes);
    app.use(`${prefix}/admin`, adminRoutes);

    app.use(`${prefix}/tasks`, authMiddleware, tasksRoutes);
    app.use(`${prefix}/checkins`, authMiddleware, checkinsRoutes);
    app.use(`${prefix}/posts`, authMiddleware, postsRoutes);
    app.use(`${prefix}/goals`, authMiddleware, goalsRoutes);
    app.use(`${prefix}/users`, authMiddleware, usersRoutes);
    app.use(`${prefix}/tools`, authMiddleware, toolsRoutes);
    app.use(`${prefix}/reports`, authMiddleware, reportsRoutes);
    app.use(`${prefix}/daily-checklist`, authMiddleware, checklistRoutes);
    app.use(`${prefix}/notifications`, authMiddleware, notificationsRoutes);
    app.use(`${prefix}/push`, authMiddleware, pushRoutes);
    app.use(`${prefix}/contents`, authMiddleware, contentsRoutes);
    app.use(`${prefix}/drive`, authMiddleware, driveRoutes);
    app.use(`${prefix}/communication`, authMiddleware, communicationRoutes);
    app.use(`${prefix}/agenda`, authMiddleware, agendaRoutes);

    app.get(`${prefix}/health`, async (req, res) => {
        try {
            const result = await pool.query('SELECT NOW()');
            res.json({ status: 'ok', database: 'connected', time: result.rows[0].now });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });
});

app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({ message: err.message || 'Erro interno do servidor' });
});

export default app;




