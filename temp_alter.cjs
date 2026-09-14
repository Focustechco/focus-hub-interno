const { pool } = require('./backend/config/db'); 
async function run() { 
    try { 
        await pool.query("ALTER TABLE goals ADD COLUMN subgoals JSONB DEFAULT '[]'::jsonb;"); 
        console.log('Column added'); 
    } catch (e) { 
        console.error(e); 
    } finally { 
        pool.end(); 
    } 
} 
run();
