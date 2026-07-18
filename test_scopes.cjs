const { pool } = require('./backend/config/db');
const https = require('https');

async function test() {
  try {
    const res = await pool.query("SELECT google_access_token FROM users WHERE role = 'ADMIN' LIMIT 1");
    if (res.rows.length === 0) return;
    const token = res.rows[0].google_access_token;
    
    https.get(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`, (resp) => {
      let data = '';
      resp.on('data', (chunk) => data += chunk);
      resp.on('end', () => console.log(data));
    });
  } catch (e) {
    console.error(e);
  }
}
test();
