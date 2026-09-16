import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pool } from './config/db.js';
import { authMiddleware } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import tasksRoutes from './routes/tasks.js';
import checkinsRoutes from './routes/checkins.js';
import postsRoutes from './routes/posts.js';
import goalsRoutes from './routes/goals.js';
import usersRoutes from './routes/users.js';
import toolsRoutes from './routes/tools.js';
import reportsRoutes from './routes/reports.js';
import checklistRoutes from './routes/dailyChecklist.js';
import notificationsRoutes from './routes/notifications.js';
import pushRoutes from './routes/push.js';
import contentsRoutes from './routes/contents.js';
import driveRoutes from './routes/drive.js';
import communicationRoutes from './routes/communication.js';
import agendaRoutes from './routes/agenda.js';
import adminRoutes from './routes/admin.js';
import googleRoutes from './routes/google.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_at_least_32_chars_long_for_security_reasons';
}

const app = express();
	app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Normalize request URL for Vercel serverless rewrites
app.use((req, res, next) => {
    const actualPath = req.headers['x-matched-path'] || req.originalUrl || req.url;
    if (req.url === '/api/index.js' || req.url.startsWith('/api/index.js')) {
        req.url = actualPath;
    }
    next();
});

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

app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        method: req.method,
        url: req.url,
        matchedPath: req.headers['x-matched-path']
    });
});

export default app;
