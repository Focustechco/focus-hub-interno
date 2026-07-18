const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:@focusOS19964@db.afxfikprunkspcfgzzil.supabase.co:5432/postgres' });

async function check() {
    try {
        const res = await pool.query('SELECT status, COUNT(*) FROM google_calendar_events GROUP BY status');
        console.log(res.rows);
    } catch(e) {
        console.error(e);
    }
    process.exit();
}
check();
