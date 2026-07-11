const express = require('express');
const cors = require('cors');
const { pool } = require('./config/db');
require('dotenv').config();

// BLOCKER #5: Validate JWT_SECRET on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: JWT_SECRET não configurado ou muito curto (mínimo 32 caracteres)!');
    console.error('Configure a variável JWT_SECRET no ficheiro .env');
    process.exit(1);
}

const app = express();

// Auto-migrate: Add status and whatsapp columns to users table if they don't exist
pool.query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS whatsapp_notifications JSONB,
    ADD COLUMN IF NOT EXISTS whatsapp_dnd_start VARCHAR(10),
    ADD COLUMN IF NOT EXISTS whatsapp_dnd_end VARCHAR(10)
`).catch(e => {
    // Ignore error if columns already exist
});

// Auto-migrate: Add agenda fields to tasks table
pool.query(`
    ALTER TABLE tasks 
    ADD COLUMN start_time VARCHAR(10),
    ADD COLUMN end_time VARCHAR(10),
    ADD COLUMN sector VARCHAR(100),
    ADD COLUMN location TEXT,
    ADD COLUMN color VARCHAR(50),
    ADD COLUMN repetition VARCHAR(50) DEFAULT 'none'
`).catch(e => {
    // Ignore error if columns already exist
});

// Auto-migrate: Create push_subscriptions table if it doesn't exist
pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).catch(e => {
    console.error('[Server] Error creating push_subscriptions table:', e.message);
});

// Auto-migrate: Create contents table if it doesn't exist
pool.query(`
    CREATE TABLE IF NOT EXISTS contents (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        file_url TEXT NOT NULL,
        cover_image TEXT,
        icon VARCHAR(50) DEFAULT 'Book',
        color VARCHAR(50) DEFAULT '#FF6B00',
        status BOOLEAN DEFAULT true,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).catch(e => {
    console.error('[Server] Error creating contents table:', e.message);
});

console.log('[Server] Environment keys:', Object.keys(process.env).sort());
console.log('[Server] GOOGLE_CLIENT_ID present:', !!process.env.GOOGLE_CLIENT_ID);
if (process.env.GOOGLE_CLIENT_ID) {
    console.log('[Server] GOOGLE_CLIENT_ID length:', process.env.GOOGLE_CLIENT_ID.length);
}
console.log('[Server] GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);

const PORT = process.env.PORT || 5000;

// Trust proxy for Render (and other reverse proxies)
// This is required for express-rate-limit to work correctly behind a proxy
app.set('trust proxy', 1);

// BLOCKER #2: Configure CORS with allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or Postman in dev)
        if (!origin) return callback(null, true);

        // Check if origin is explicitly allowed OR if it's a Vercel preview URL
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com') || origin.endsWith('.github.io')) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Não permitido pelo CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit payload size

// Security: Add helmet for security headers
const helmet = require('helmet');
app.use(helmet());

// Security: Rate limiting to prevent brute-force attacks
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per IP per window
    message: { message: 'Muitas requisições. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    // Disable X-Forwarded-For validation (we already have trust proxy set)
    validate: { xForwardedForHeader: false }
});
app.use('/api/', apiLimiter);

// Import auth middleware
const { authMiddleware } = require('./middleware/auth');

// Public routes (no auth required)
app.use('/api/auth', require('./routes/auth'));

// Protected routes (auth required) - BLOCKER #3
app.use('/api/tasks', authMiddleware, require('./routes/tasks'));
app.use('/api/checkins', authMiddleware, require('./routes/checkins'));
app.use('/api/posts', authMiddleware, require('./routes/posts'));
app.use('/api/goals', authMiddleware, require('./routes/goals'));
app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/tools', authMiddleware, require('./routes/tools'));
app.use('/api/daily-checklist', authMiddleware, require('./routes/dailyChecklist'));
app.use('/api/notifications', authMiddleware, require('./routes/notifications'));
app.use('/api/push', authMiddleware, require('./routes/push'));
app.use('/api/contents', authMiddleware, require('./routes/contents'));

// Serve storage directory statically
const path = require('path');
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Checking original content: line 86 was app.use.
// so I should restore it to app.use.
app.use('/api/migrate', require('./routes/migrate')); // Public migration route
app.use('/api/whatsapp', require('./routes/whatsapp')); // WhatsApp integration
app.use('/api/google', require('./routes/google')); // Google Calendar integration

// Health check and root routes
app.get('/', (req, res) => {
    res.send('Focus Hub API is running');
});

app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'ok', time: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Erro interno do servidor' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

    // Initialize WhatsApp notification scheduler
    try {
        const whatsAppService = require('./services/whatsappService');
        const NotificationScheduler = require('./services/notificationScheduler');
        const scheduler = new NotificationScheduler(whatsAppService);
        scheduler.start();
        console.log('[Server] WhatsApp notification scheduler started');
    } catch (error) {
        console.warn('[Server] WhatsApp scheduler not started:', error.message);
    }
});
