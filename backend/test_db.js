const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/focushub' });
async function run() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN birth_date DATE');
    console.log('Column added');
  } catch(e) {
    console.log('Error:', e.message);
  }
  process.exit();
}
run();
