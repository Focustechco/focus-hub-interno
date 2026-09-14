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

    console.log('[Register] Starting registration for:', email);

    try {
        // Check if user already exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            console.log('[Register] User already exists:', email);
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user with is_approved = false (pending)
        const id = 'u' + Date.now();
        console.log('[Register] Inserting user with id:', id);

        const newUser = await pool.query(
            `INSERT INTO users (id, name, email, password, role, sector, job_title, join_date, avatar_url, is_approved)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
             RETURNING *`,
            [id, name, email, hashedPassword, (role || 'USER').toUpperCase(), sector, jobTitle, `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`, false]
        );

        console.log('[Register] User inserted successfully:', id);

        // Send approval email to admin (non-blocking - don't wait for it)
        sendApprovalEmail(newUser.rows[0]).catch(err => {
            console.error('[Register] Email sending failed (non-blocking):', err.message);
        });

        // Return success message immediately
        console.log('[Register] Returning success response');
        res.status(201).json({
            message: 'Cadastro realizado com sucesso! Seu acesso está pendente de aprovação. Você receberá um email quando for aprovado.',
            pending: true
        });
    } catch (err) {
        console.error('[Register] Error:', err.message);
        console.error('[Register] Stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
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

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    console.log('[ForgotPassword] Request for:', email);

    try {
        // Check if user exists
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({ message: 'Se o email existir, você receberá instruções de recuperação.' });
        }

        // Generate reset token (simple approach - use JWT)
        const resetToken = jwt.sign(
            { id: user.id, email: user.email, type: 'password-reset' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Store token in database (optional - for extra security you could store a hash)
        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
            [resetToken, user.id]
        );

        // Send reset email
        try {
            // Validate email configuration first
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
                console.error('[ForgotPassword] EMAIL_USER or EMAIL_PASS not configured!');
                return res.status(500).json({
                    message: 'Serviço de email não configurado. Entre em contato com o administrador.'
                });
            }

            const transporter = createTransporter();
            const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

            console.log('[ForgotPassword] Attempting to send email to:', email);
            console.log('[ForgotPassword] Using EMAIL_USER:', process.env.EMAIL_USER);

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: '[Focus Hub] Recuperação de Senha',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #FF6B00;">🔐 Recuperação de Senha</h2>
                        <p>Olá ${user.name},</p>
                        <p>Você solicitou a recuperação da sua senha no Focus Hub.</p>
                        <p>Clique no botão abaixo para criar uma nova senha:</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" style="background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Redefinir Senha
                            </a>
                        </p>
                        <p style="color: #666; font-size: 12px;">
                            Este link expira em 1 hora. Se você não solicitou esta recuperação, ignore este email.
                        </p>
                    </div>
                `
            });
            console.log('[ForgotPassword] Email sent successfully to:', email);

            res.json({
                message: 'Email de recuperação enviado! Verifique sua caixa de entrada e spam.'
            });
        } catch (emailErr) {
            console.error('[ForgotPassword] Email error:', emailErr.message);
            console.error('[ForgotPassword] Full error:', emailErr);

            // Return actual error to user
            return res.status(500).json({
                message: 'Erro ao enviar email. Verifique se o email está correto ou tente novamente mais tarde.',
                error: process.env.NODE_ENV === 'development' ? emailErr.message : undefined
            });
        }
    } catch (err) {
        console.error('[ForgotPassword] General Error:', err.message);
        console.error('[ForgotPassword] Stack:', err.stack);
        res.status(500).json({
            message: 'Erro interno do servidor',
            error: err.message
        });
    }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    console.log('[ResetPassword] Attempting password reset');

    try {
        // Verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.type !== 'password-reset') {
                return res.status(400).json({ message: 'Token inválido.' });
            }
        } catch (jwtErr) {
            console.error('[ResetPassword] Token invalid:', jwtErr.message);
            return res.status(400).json({ message: 'Token expirado ou inválido.' });
        }

        // Check if token matches in database
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
            [decoded.id, token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Token expirado ou já utilizado.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear reset token
        await pool.query(
            'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
            [hashedPassword, decoded.id]
        );

        console.log('[ResetPassword] Password reset successful for user:', decoded.id);
        res.json({ message: 'Senha alterada com sucesso! Você já pode fazer login.' });
    } catch (err) {
        console.error('[ResetPassword] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;


