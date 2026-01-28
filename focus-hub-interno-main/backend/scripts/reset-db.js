const { pool } = require('../config/db');

async function resetDb() {
    try {
        console.log('Resetting database...');
        // Truncate all tables and restart identity columns
        await pool.query('TRUNCATE TABLE users, tasks, check_ins, posts, goals RESTART IDENTITY CASCADE');
        console.log('Database reset complete. All users and data cleared.');
    } catch (err) {
        console.error('Reset failed:', err);
    } finally {
        await pool.end();
    }
}

resetDb();
