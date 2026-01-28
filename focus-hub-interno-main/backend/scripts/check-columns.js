const { pool } = require('../config/db');

async function checkColumns() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'check_ins';
        `);
        console.log('Columns in check_ins:', res.rows.map(r => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkColumns();
