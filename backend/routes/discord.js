const express = require('express');
const router = express.Router();
const discordService = require('../services/discordService');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Temporary storage for attachments
const fs = require('fs');
const path = require('path');

// Configure integration (Admin only)
router.post('/config', async (req, res) => {
    try {
        const { botToken, serverId } = req.body;
        if (!botToken || !serverId) return res.status(400).json({ error: 'Token and Server ID are required' });
        
        await pool.query(
            'INSERT INTO discord_integration (bot_token, server_id, connected_by) VALUES ($1, $2, $3)',
            [botToken, serverId, req.user.id]
        );
        
        const initResult = await discordService.init();
        res.json(initResult);
    } catch (err) {
        console.error('Error configuring discord:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get connection status
router.get('/status', async (req, res) => {
    try {
        const status = await discordService.getStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get channels
router.get('/channels', async (req, res) => {
    try {
        const channels = await discordService.getChannels();
        res.json(channels);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get messages for a channel
router.get('/channels/:channelId/messages', async (req, res) => {
    try {
        const { limit, before } = req.query;
        const messages = await discordService.getMessages(req.params.channelId, limit, before);
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Send a message
router.post('/channels/:channelId/messages', upload.array('attachments'), async (req, res) => {
    try {
        const { content } = req.body;
        const channelId = req.params.channelId;
        
        // Get user info
        const userRes = await pool.query('SELECT name, avatar FROM users WHERE id = $1', [req.user.id]);
        const user = userRes.rows[0];
        
        const attachments = req.files.map(file => {
            return {
                attachment: file.path,
                name: file.originalname
            };
        });

        const message = await discordService.sendMessage(channelId, {
            name: user.name,
            avatarUrl: user.avatar
        }, content, attachments);
        
        // Cleanup temp files
        req.files.forEach(file => {
            fs.unlink(file.path, () => {});
        });
        
        res.json({ success: true, messageId: message.id });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get Discord users (for syncing)
router.get('/users', async (req, res) => {
    try {
        const users = await discordService.getUsers();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Map local user to Discord user
router.post('/users/:userId/map', async (req, res) => {
    try {
        const { discordUserId } = req.body;
        await pool.query('UPDATE users SET discord_user_id = $1 WHERE id = $2', [discordUserId, req.params.userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
