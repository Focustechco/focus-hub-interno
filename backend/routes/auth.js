const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Mock user for initial login (since we don't have registration yet)
// In a real app, you'd query the database.
// For now, we'll check against the DB, but if it's empty, we might need to seed it.

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Require password for all users - no bypass allowed
        if (!user.password) {
            return res.status(401).json({
                message: 'Conta não configurada. Contacte o administrador para definir uma password.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role ? user.role.toUpperCase() : 'USER',
                avatarUrl: user.avatar_url,
                sector: user.sector,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role ? user.role.toUpperCase() : 'USER',
            avatarUrl: user.avatar_url,
            sector: user.sector,
        });
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
    const { name, email, password, role, sector, jobTitle } = req.body;

    try {
        // Check if user already exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        // Generate a simple ID for now (in production, use UUID or serial)
        const id = 'u' + Date.now();
        const newUser = await pool.query(
            `INSERT INTO users (id, name, email, password, role, sector, job_title, join_date, avatar_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
             RETURNING *`,
            [id, name, email, hashedPassword, (role || 'USER').toUpperCase(), sector, jobTitle, `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`]
        );

        // Generate JWT
        const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({ token, user: newUser.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
