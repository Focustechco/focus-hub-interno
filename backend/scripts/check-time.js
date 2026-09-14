const { pool } = require('../config/db');

async function checkTime() {
    try {
        const jsDate = new Date();
        console.log('Node.js Date:', jsDate.toString());
        console.log('Node.js ISO:', jsDate.toISOString());
        console.log('Node.js Local String (pt-BR):', jsDate.toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }));

        const res = await pool.query("SELECT NOW() as db_time, CURRENT_TIME as db_curr_time, timezone('America/Fortaleza', NOW()) as db_fortaleza_time");
        console.log('DB Time (Raw):', res.rows[0].db_time);
        console.log('DB Time (Fortaleza):', res.rows[0].db_fortaleza_time);
    } catch (err) {
        console.error('Error checking time:', err);
    } finally {
        pool.end();
    }
}

checkTime();
