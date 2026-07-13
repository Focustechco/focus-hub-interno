/**
 * Database Migration Utility
 * Runs on server startup to ensure schema consistency
 */

const { pool } = require('./config/db');

// Core tables that must exist
const REQUIRED_TABLES = [
    'users',
    'tasks',
    'goals',
    'check_ins',
    'posts',
    'daily_checklist',
    'focus_links',
    'access_groups',
    'access_credentials',
    'notifications',
    'task_comments',
    'task_tags',
    'reports',
    'report_templates'
];

// Migration queries to run (idempotent)
const MIGRATIONS = [
    // Add reports table
    `CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        content TEXT,
        author_id VARCHAR(255),
        department VARCHAR(100),
        is_favorite BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Add report templates table
    `CREATE TABLE IF NOT EXISTS report_templates (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        config JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    // Add task_comments table
    `CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(255) NOT NULL,
        author_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Add task_tags table
    `CREATE TABLE IF NOT EXISTS task_tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        color VARCHAR(7) NOT NULL DEFAULT '#FF6B00'
    )`,

    // Add task_tag_assignments junction table
    `CREATE TABLE IF NOT EXISTS task_tag_assignments (
        task_id VARCHAR(255) NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, tag_id)
    )`,

    // Audit logs table
    `CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        user_name VARCHAR(255),
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(255),
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Webhook configs table
    `CREATE TABLE IF NOT EXISTS webhook_configs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        url TEXT NOT NULL,
        enabled BOOLEAN DEFAULT true,
        events TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Add missing columns to existing tables (use ALTER with IF NOT EXISTS pattern)
    `DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'reset_token') THEN
            ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'reset_token_expires') THEN
            ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_approved') THEN
            ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT false;
        END IF;
    END $$`,

    `DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'status') THEN
            ALTER TABLE goals ADD COLUMN status VARCHAR(20) DEFAULT 'em_andamento';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'metric') THEN
            ALTER TABLE goals ADD COLUMN metric VARCHAR(50);
        END IF;
    END $$`,

    `DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'focus_links' AND column_name = 'title') THEN
            ALTER TABLE focus_links ADD COLUMN title VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'focus_links' AND column_name = 'is_favorite') THEN
            ALTER TABLE focus_links ADD COLUMN is_favorite BOOLEAN DEFAULT false;
        END IF;
    END $$`,

    `DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'whatsapp') THEN
            ALTER TABLE users ADD COLUMN whatsapp VARCHAR(20);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'whatsapp_notifications') THEN
            ALTER TABLE users ADD COLUMN whatsapp_notifications JSONB DEFAULT '{"tasks": true, "reminders": true, "daily_summary": true, "posts": false}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'whatsapp_dnd_start') THEN
            ALTER TABLE users ADD COLUMN whatsapp_dnd_start TIME;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'whatsapp_dnd_end') THEN
            ALTER TABLE users ADD COLUMN whatsapp_dnd_end TIME;
        END IF;
    END $$`,

    // WhatsApp message logs
    `CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50),
        phone VARCHAR(20),
        message TEXT,
        direction VARCHAR(10),
        status VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
];

/**
 * Run all migrations
 */
async function runMigrations() {
    console.log('[Migration] Starting database migrations...');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < MIGRATIONS.length; i++) {
        const migration = MIGRATIONS[i];
        try {
            await pool.query(migration);
            successCount++;
        } catch (error) {
            errorCount++;
            console.error(`[Migration] Failed migration ${i + 1}:`, error.message);
        }
    }

    console.log(`[Migration] Completed: ${successCount} success, ${errorCount} errors`);

    // Verify required tables exist
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const existingTables = result.rows.map(r => r.table_name);
        const missingTables = REQUIRED_TABLES.filter(t => !existingTables.includes(t));

        if (missingTables.length > 0) {
            console.warn('[Migration] Warning: Missing tables:', missingTables.join(', '));
        } else {
            console.log('[Migration] All required tables present');
        }
    } catch (error) {
        console.error('[Migration] Failed to verify tables:', error.message);
    }

    return { successCount, errorCount };
}

module.exports = { runMigrations };
