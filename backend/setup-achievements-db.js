const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/focushub'
});

async function setupDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                icon VARCHAR(100) DEFAULT 'Trophy',
                awarded_to VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
                created_by VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Achievements table created successfully');
    } catch (err) {
        console.error('Error creating achievements table:', err);
    } finally {
        await pool.end();
    }
}

setupDB();
