const { pool } = require('../config/db');

async function createTables() {
    try {
        // Drop existing tables to ensure schema match
        await pool.query('DROP TABLE IF EXISTS check_ins');
        await pool.query('DROP TABLE IF EXISTS posts');
        await pool.query('DROP TABLE IF EXISTS goals');

        // Check-ins Table
        await pool.query(`
            CREATE TABLE check_ins (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) REFERENCES users(id),
                type VARCHAR(20) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                location VARCHAR(100),
                mood VARCHAR(20),
                notes TEXT
            );
        `);
        console.log('Check-ins table created');

        // Posts Table
        await pool.query(`
            CREATE TABLE posts (
                id VARCHAR(50) PRIMARY KEY,
                author_id VARCHAR(50) REFERENCES users(id),
                content TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                likes INTEGER DEFAULT 0,
                comments JSONB DEFAULT '[]'
            );
        `);
        console.log('Posts table created');

        // Goals Table
        await pool.query(`
            CREATE TABLE goals (
                id VARCHAR(50) PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                description TEXT,
                progress INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'pending',
                due_date TIMESTAMP,
                sector VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Goals table created');

    } catch (err) {
        console.error('Error creating tables:', err);
    } finally {
        await pool.end();
    }
}

createTables();
