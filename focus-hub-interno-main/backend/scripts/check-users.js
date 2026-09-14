const { pool } = require('../config/db');

async function checkUsers() {
    try {
        const res = await pool.query('SELECT id, email, role, password FROM users');
        console.log('Users found:', res.rows.length);
        console.table(res.rows);
    } catch (err) {
        console.error('Error querying users:', err);
    } finally {
        await pool.end();
    }
}

checkUsers();
