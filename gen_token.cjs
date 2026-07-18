const fs = require('fs');
const { pool } = require('./backend/config/db');

async function test() {
  try {
    const jwt = require(process.cwd() + '/backend/node_modules/jsonwebtoken');
    require(process.cwd() + '/backend/node_modules/dotenv').config({ path: './backend/.env' });
    
    const resDb = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
    if (resDb.rows.length === 0) {
      console.log('No admin found');
      return;
    }
    const adminId = resDb.rows[0].id;
    const token = jwt.sign({ id: adminId, role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    fs.writeFileSync('token.txt', token);
    console.log('Token written to token.txt');
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
test();
