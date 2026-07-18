const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:@focusOS19964@db.afxfikprunkspcfgzzil.supabase.co:5432/postgres' });
pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'").then(res => {
    console.log(res.rows);
    process.exit(0);
}).catch(e => {
    console.error(e);
    process.exit(1);
});
