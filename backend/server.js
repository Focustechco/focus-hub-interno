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
const PORT = process.env.PORT || 5000;

// BLOCKER #2: Configure CORS with allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or Postman in dev)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
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
    max: 100, // 100 requests per IP per window
    message: { message: 'Muitas requisições. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
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
});
