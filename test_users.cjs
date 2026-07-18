const { pool } = require('./backend/config/db');

async function test() {
  try {
    const res = await pool.query("SELECT id, name, role, google_access_token FROM users");
    console.log('Users in DB:');
    console.table(res.rows);
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit();
}
test();
