require('dotenv').config();
const { pool } = require('./config/db');

async function setup() {
    try {
        await pool.query(`DROP TABLE IF EXISTS goal_history CASCADE;`);
        await pool.query(`DROP TABLE IF EXISTS goals CASCADE;`);
        
        await pool.query(`
            CREATE TABLE goals (
                id VARCHAR(255) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                sector VARCHAR(255),
                responsible_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
                team VARCHAR(255),
                start_date DATE,
                end_date DATE,
                target_value NUMERIC DEFAULT 0,
                current_value NUMERIC DEFAULT 0,
                metric VARCHAR(50) DEFAULT 'count',
                category VARCHAR(50) DEFAULT 'quantity',
                scope VARCHAR(50) DEFAULT 'individual',
                priority VARCHAR(50) DEFAULT 'medium',
                status VARCHAR(50) DEFAULT 'active',
                color VARCHAR(50) DEFAULT '#FF6B00',
                weight INTEGER DEFAULT 1,
                allow_overflow BOOLEAN DEFAULT false,
                observations TEXT,
                created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE goal_history (
                id VARCHAR(255) PRIMARY KEY,
                goal_id VARCHAR(255) REFERENCES goals(id) ON DELETE CASCADE,
                user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(255) NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS goal_weight INTEGER DEFAULT 1;`);

        console.log('Database updated for Goals module');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

setup();
