import { Pool } from 'pg';

const SUPABASE_DB_URL = 'postgresql://postgres.vxqernhfgulaewtmfagh:Focus%21%40%214235@aws-1-us-west-2.pooler.supabase.com:6543/postgres';
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
        const result = await pool.query('SELECT NOW() as now, COUNT(*) as user_count FROM users');
        return res.status(200).json({
            status: 'ok',
            database: 'connected',
            users: result.rows[0].user_count,
            time: result.rows[0].now
        });
    } catch (err) {
        return res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
}
