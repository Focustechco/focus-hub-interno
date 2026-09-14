const { pool } = require('../config/db');

async function createToolsSchema() {
    try {
        console.log('Creating Focus Tools schema...');

        // Focus Links Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS focus_links (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                category TEXT NOT NULL,
                icon TEXT,
                user_id TEXT, -- Optional, for personal links
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Access Groups Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS access_groups (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Access Credentials Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS access_credentials (
                id TEXT PRIMARY KEY,
                group_id TEXT REFERENCES access_groups(id) ON DELETE CASCADE,
                service_name TEXT NOT NULL,
                username TEXT,
                password TEXT,
                url TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('Focus Tools schema created successfully!');
    } catch (err) {
        console.error('Error creating schema:', err);
    } finally {
        await pool.end();
    }
}

createToolsSchema();
