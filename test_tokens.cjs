const { pool } = require('./backend/config/db');

async function test() {
  try {
    const res = await pool.query("SELECT id, google_access_token, google_refresh_token, google_token_expires FROM users WHERE role = 'ADMIN'");
    console.table(res.rows);
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
test();
