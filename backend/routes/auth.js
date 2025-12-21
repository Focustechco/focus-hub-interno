const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const nodemailer = require('nodemailer');

// Email configuration for sending approval requests
const ADMIN_EMAIL = 'agenciafocusmarketing.co@gmail.com';
const APP_URL = process.env.APP_URL || 'https://focus-hub-interno.vercel.app';

// Create transporter (using environment variables)
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Send approval request email
const sendApprovalEmail = async (newUser) => {
    try {
        const transporter = createTransporter();

        const approvalLink = `${APP_URL}/api/auth/approve/${newUser.id}?action=approve`;
        const rejectLink = `${APP_URL}/api/auth/approve/${newUser.id}?action=reject`;

        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@focushub.com',
            to: ADMIN_EMAIL,
            subject: `[Focus Hub] Nova Solicitação de Cadastro: ${newUser.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #FF6B00;">📋 Nova Solicitação de Cadastro</h2>
                    <p>Um novo usuário solicitou acesso ao Focus Hub:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Nome:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${newUser.name}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${newUser.email}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Setor:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${newUser.sector || 'Não informado'}</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Cargo:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${newUser.job_title || 'Não informado'}</td></tr>
                        <tr><td style="padding: 8px;"><strong>Data:</strong></td><td style="padding: 8px;">${new Date().toLocaleString('pt-BR')}</td></tr>
                    </table>
                    
                    <p>Para aprovar ou rejeitar este cadastro, acesse o painel de administração do Focus Hub.</p>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Este email foi enviado automaticamente pelo Focus Hub.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('[Auth] Approval email sent to:', ADMIN_EMAIL);
        return true;
    } catch (error) {
        console.error('[Auth] Failed to send approval email:', error.message);
        // Don't fail the registration if email fails
        return false;
    }
};

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user is approved
        if (user.is_approved === false) {
            return res.status(403).json({
                message: 'Seu cadastro está pendente de aprovação. Você receberá um email quando for aprovado.',
                pending: true
            });
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

// POST /api/auth/register - Register a new user (pending approval)
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

        // Insert new user with is_approved = false (pending)
        const id = 'u' + Date.now();
        const newUser = await pool.query(
            `INSERT INTO users (id, name, email, password, role, sector, job_title, join_date, avatar_url, is_approved)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
             RETURNING *`,
            [id, name, email, hashedPassword, (role || 'USER').toUpperCase(), sector, jobTitle, `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`, false]
        );

        // Send approval email to admin
        await sendApprovalEmail(newUser.rows[0]);

        // Return success message (user cannot login until approved)
        res.status(201).json({
            message: 'Cadastro realizado com sucesso! Seu acesso está pendente de aprovação. Você receberá um email quando for aprovado.',
            pending: true
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/auth/pending - Get pending approval requests (admin only)
router.get('/pending', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, sector, job_title, join_date, avatar_url 
             FROM users WHERE is_approved = false 
             ORDER BY join_date DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/auth/approve/:id - Approve or reject a user
router.put('/approve/:id', async (req, res) => {
    const { id } = req.params;
    const { approved } = req.body;

    try {
        if (approved) {
            await pool.query('UPDATE users SET is_approved = true WHERE id = $1', [id]);
            res.json({ message: 'Usuário aprovado com sucesso!' });
        } else {
            // Delete rejected user
            await pool.query('DELETE FROM users WHERE id = $1', [id]);
            res.json({ message: 'Usuário rejeitado e removido.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

