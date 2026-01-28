const { pool } = require('../config/db');

async function findUser() {
    try {
        const res = await pool.query("SELECT id, name, email, role FROM users WHERE email LIKE '%gabriel%'");
        console.log('Users found:', res.rows);
    } catch (err) {
        console.error('Error finding user:', err);
    } finally {
        pool.end();
    }
}

findUser();
