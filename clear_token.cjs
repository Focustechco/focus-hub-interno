const { pool } = require('./backend/config/db');

async function test() {
  try {
    await pool.query("UPDATE users SET google_access_token = NULL WHERE role = 'ADMIN'");
    console.log('Cleared access token');
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
test();
