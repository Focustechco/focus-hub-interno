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
    ADD COLUMN IF NOT EXISTS whatsapp_dnd_end VARCHAR(10);

    -- Tabela para o Chat Interno
    CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(50) PRIMARY KEY,
        sender_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        receiver_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        attachments JSONB,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Tabela para grupos de chat
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

// Auto-migrate: Create drive_folder_permissions table for Drive module
pool.query(`
    CREATE TABLE IF NOT EXISTS drive_folder_permissions (
        id SERIAL PRIMARY KEY,
        folder_id VARCHAR(255) NOT NULL,
        folder_name VARCHAR(500) NOT NULL,
        sector VARCHAR(100) NOT NULL,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(folder_id, sector)
    )
`).catch(e => {
    console.error('[Server] Error creating drive_folder_permissions table:', e.message);
});

// Auto-migrate: Create google_corporate_integration and google_calendar_events tables
pool.query(`
    CREATE TABLE IF NOT EXISTS google_corporate_integration (
        id SERIAL PRIMARY KEY,
        google_email VARCHAR(255) NOT NULL,
        google_name VARCHAR(255),
        google_avatar_url TEXT,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expires_at TIMESTAMP WITH TIME ZONE,
        selected_calendars JSONB DEFAULT '["primary"]',
        sync_interval_minutes INTEGER DEFAULT 5,
        allow_user_create_events BOOLEAN DEFAULT false,
        last_sync_at TIMESTAMP WITH TIME ZONE,
        sync_status VARCHAR(50) DEFAULT 'never',
        events_count INTEGER DEFAULT 0,
        connected_by VARCHAR(255) REFERENCES users(id),
        connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS google_calendar_events (
        id VARCHAR(255) PRIMARY KEY,
        calendar_id VARCHAR(255) DEFAULT 'primary',
        title VARCHAR(500) NOT NULL,
        description TEXT,
        location TEXT,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        all_day BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'confirmed',
        google_meet_link TEXT,
        hangout_link TEXT,
        html_link TEXT,
        organizer_email VARCHAR(255),
        organizer_name VARCHAR(255),
        attendees JSONB,
        recurrence JSONB,
        color_id VARCHAR(10),
        color_hex VARCHAR(10),
        reminders JSONB,
        raw_event JSONB,
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
`).catch(e => {
    console.error('[Server] Error creating google calendar integration tables:', e.message);
});

// Auto-migrate: Create discord_integration table and update users
pool.query(`
    CREATE TABLE IF NOT EXISTS discord_integration (
        id SERIAL PRIMARY KEY,
        bot_token TEXT NOT NULL,
        server_id VARCHAR(255) NOT NULL,
        connected_by VARCHAR(255) REFERENCES users(id),
        connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS discord_user_id VARCHAR(255);
`).catch(e => {
    console.error('[Server] Error creating discord integration tables:', e.message);
});

// Auto-migrate: Phase 2 Admin Center (Sectors, Modules, Permissions)
pool.query(`
    CREATE TABLE IF NOT EXISTS sectors (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        color VARCHAR(50) DEFAULT '#FF6B00',
        description TEXT,
        manager_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_modules (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS module_sector_access (
        module_slug VARCHAR(100) REFERENCES system_modules(slug) ON DELETE CASCADE,
        sector_name VARCHAR(255) REFERENCES sectors(name) ON DELETE CASCADE,
        PRIMARY KEY (module_slug, sector_name)
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        module_slug VARCHAR(100) NOT NULL,
        can_view BOOLEAN DEFAULT true,
        can_create BOOLEAN DEFAULT false,
        can_edit BOOLEAN DEFAULT false,
        can_delete BOOLEAN DEFAULT false,
        can_admin BOOLEAN DEFAULT false,
        UNIQUE(role, module_slug)
    );

    -- Insert default sectors if none exist
    INSERT INTO sectors (id, name, color) VALUES 
        ('sec_admin', 'Administração', '#FF6B00'),
        ('sec_tech', 'Tech', '#3B82F6'),
        ('sec_rh', 'RH', '#10B981'),
        ('sec_com', 'Comercial', '#F59E0B'),
        ('sec_fin', 'Financeiro', '#8B5CF6')
    ON CONFLICT (name) DO NOTHING;

    -- Insert default modules if none exist
    INSERT INTO system_modules (id, name, slug, description, icon) VALUES 
        ('mod_dash', 'Dashboard', 'dashboard', 'Visão geral', 'LayoutDashboard'),
        ('mod_checkin', 'Check-in', 'check-in', 'Registro de ponto', 'Clock'),
        ('mod_tasks', 'Tarefas', 'tasks', 'Gestão de tarefas', 'CheckSquare'),
        ('mod_mural', 'Mural', 'mural', 'Comunicação interna', 'MessageSquare'),
        ('mod_goals', 'Metas', 'goals', 'Acompanhamento de metas', 'Target'),
        ('mod_tools', 'Focus Tools', 'focus-tools', 'Ferramentas', 'Wrench'),
        ('mod_admin', 'Admin Center', 'admin', 'Administração', 'Shield'),
        ('mod_integ', 'Integrações', 'integrations', 'Conexões', 'Link2'),
        ('mod_drive', 'Drive', 'drive', 'Arquivos', 'HardDrive'),
        ('mod_reports', 'Relatórios', 'reports', 'Métricas', 'FileText'),
        ('mod_agenda', 'Agenda', 'agenda', 'Calendário corporativo', 'Calendar')
    ON CONFLICT (slug) DO NOTHING;
`).catch(e => {
    console.error('[Server] Error creating Admin Center Phase 2 tables:', e.message);
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

        // Check if origin is explicitly allowed OR if it's a Vercel preview URL OR localhost or local network IP
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com') || origin.endsWith('.github.io') || origin.startsWith('http://localhost:') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
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
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Security: Rate limiting to prevent brute-force attacks
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100000, // Increased max limit to prevent blocking during development
    message: { message: 'Muitas requisições. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
    // Disable X-Forwarded-For validation (we already have trust proxy set)
    validate: { xForwardedForHeader: false }
});
app.use('/api/', apiLimiter);

// Import auth middleware
const { authMiddleware } = require('./middleware/auth');

// Importar e inicializar Discord Service
const discordService = require('./services/discordService');
discordService.init().then(res => {
    if (res.success) {
        console.log('[Discord] Integration initialized automatically.');
    }
}).catch(console.error);

// Public routes (no auth required)
app.use('/api/auth', require('./routes/auth'));

// Protected routes (auth required) - BLOCKER #3
app.use('/api/tasks', authMiddleware, require('./routes/tasks'));
app.use('/api/checkins', authMiddleware, require('./routes/checkins'));
app.use('/api/posts', authMiddleware, require('./routes/posts'));
app.use('/api/goals', authMiddleware, require('./routes/goals'));
app.use('/api/users', authMiddleware, require('./routes/users'));
app.use('/api/tools', authMiddleware, require('./routes/tools'));
app.use('/api/reports', authMiddleware, require('./routes/reports'));
app.use('/api/daily-checklist', authMiddleware, require('./routes/dailyChecklist'));
app.use('/api/notifications', authMiddleware, require('./routes/notifications'));
app.use('/api/push', authMiddleware, require('./routes/push'));
app.use('/api/contents', authMiddleware, require('./routes/contents'));
app.use('/api/drive', authMiddleware, require('./routes/drive'));
app.use('/api/communication', authMiddleware, require('./routes/communication'));
app.use('/api/discord', authMiddleware, require('./routes/discord'));

// Serve storage directory statically
const path = require('path');
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Checking original content: line 86 was app.use.
// so I should restore it to app.use.
app.use('/api/migrate', require('./routes/migrate')); // Public migration route
app.use('/api/whatsapp', require('./routes/whatsapp')); // WhatsApp integration
app.use('/api/google', require('./routes/google')); // Google Calendar integration
app.use('/api/agenda', authMiddleware, require('./routes/agenda')); // Agenda Corporativa leitura
app.use('/api/admin', require('./routes/admin')); // Admin Center routes

// API to get active modules for frontend navigation (accessible to all authenticated users)
app.get('/api/system/modules', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT slug, is_active FROM system_modules');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch modules' });
    }
});

// API to get role permissions for frontend navigation
app.get('/api/system/permissions', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT module_slug, can_view FROM role_permissions WHERE role = $1', [req.user.role]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch permissions' });
    }
});

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
const http = require('http');
const server = http.createServer(app);

const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});
require('./sockets/chat')(io);

server.listen(PORT, () => {
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
