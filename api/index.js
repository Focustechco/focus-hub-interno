const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_at_least_32_chars_long_for_security_reasons';
}

const { pool } = require('../backend/config/db');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const { authMiddleware } = require('../backend/middleware/auth');

// Public routes
app.use('/api/auth', require('../backend/routes/auth'));
app.use('/api/google', require('../backend/routes/google'));
app.use('/api/admin', require('../backend/routes/admin'));

// Protected routes
app.use('/api/tasks', authMiddleware, require('../backend/routes/tasks'));
app.use('/api/checkins', authMiddleware, require('../backend/routes/checkins'));
app.use('/api/posts', authMiddleware, require('../backend/routes/posts'));
app.use('/api/goals', authMiddleware, require('../backend/routes/goals'));
app.use('/api/users', authMiddleware, require('../backend/routes/users'));
app.use('/api/tools', authMiddleware, require('../backend/routes/tools'));
app.use('/api/reports', authMiddleware, require('../backend/routes/reports'));
app.use('/api/daily-checklist', authMiddleware, require('../backend/routes/dailyChecklist'));
app.use('/api/notifications', authMiddleware, require('../backend/routes/notifications'));
app.use('/api/push', authMiddleware, require('../backend/routes/push'));
app.use('/api/contents', authMiddleware, require('../backend/routes/contents'));
app.use('/api/drive', authMiddleware, require('../backend/routes/drive'));
app.use('/api/communication', authMiddleware, require('../backend/routes/communication'));
app.use('/api/agenda', authMiddleware, require('../backend/routes/agenda'));

// Optional bot routes (safely guarded for serverless execution)
if (process.env.ENABLE_BOTS === 'true') {
    try {
        app.use('/api/whatsapp', require('../backend/routes/whatsapp'));
    } catch (e) {
        console.warn('[Serverless] WhatsApp route disabled:', e.message);
    }
}

try {
    app.use('/api/discord', authMiddleware, require('../backend/routes/discord'));
} catch (e) {
    console.warn('[Serverless] Discord route disabled:', e.message);
}

app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'ok', database: 'connected', time: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({ message: err.message || 'Erro interno do servidor' });
});

module.exports = app;

