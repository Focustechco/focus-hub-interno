const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/run', async (req, res) => {
    try {
        const queries = [
            // Focus Links
            'ALTER TABLE focus_links ADD COLUMN IF NOT EXISTS user_id TEXT',
            'ALTER TABLE focus_links ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE',
            'ALTER TABLE focus_links ADD COLUMN IF NOT EXISTS icon TEXT',
            'ALTER TABLE focus_links ADD COLUMN IF NOT EXISTS category TEXT',

            // Goals
            'ALTER TABLE goals ADD COLUMN IF NOT EXISTS metric TEXT',
            'ALTER TABLE goals ADD COLUMN IF NOT EXISTS status TEXT',
            'ALTER TABLE goals ADD COLUMN IF NOT EXISTS due_date TIMESTAMP',
            'ALTER TABLE goals ADD COLUMN IF NOT EXISTS sector TEXT',
            'ALTER TABLE goals ADD COLUMN IF NOT EXISTS period TEXT',
            'ALTER TABLE goals ADD COLUMN IF NOT EXISTS type TEXT',
            'ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id TEXT',
            'ALTER TABLE goals ADD COLUMN IF NOT EXISTS is_monthly_highlight BOOLEAN DEFAULT FALSE',

            // Google Integration
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT',
            'ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expires BIGINT'
        ];

        const results = [];
        for (const query of queries) {
            try {
                await pool.query(query);
                results.push(`Success: ${query}`);
            } catch (e) {
                results.push(`Error (${query}): ${e.message}`);
                console.error(e);
            }
        }

        res.json({ status: 'completed', results });
    } catch (err) {
        console.error(err);
        res.status(500).send('Migration fatal error: ' + err.message);
    }
});

module.exports = router;
