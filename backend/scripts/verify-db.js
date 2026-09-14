const { pool } = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verify() {
    try {
        console.log('Verifying tasks...');
        const res = await pool.query('SELECT * FROM tasks');
        console.log('Tasks count:', res.rows.length);
        console.log('Tasks:', res.rows);
    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await pool.end();
    }
}

verify();
