const { pool } = require('./backend/config/db');

async function fix() {
  try {
    await pool.query("UPDATE users SET role = 'ADMIN'");
    console.log('Fixed user roles to ADMIN');
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit();
}
fix();
