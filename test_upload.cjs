const http = require('http');
const fs = require('fs');
const { pool } = require('./backend/config/db');

async function test() {
  try {
    // 1. Get an admin user and their JWT token or just bypass?
    // Oh wait, we need a JWT token to call /api/drive/upload!
    // Let's generate a token just like authMiddleware does.
    const jwt = require(process.cwd() + '/backend/node_modules/jsonwebtoken');
    require(process.cwd() + '/backend/node_modules/dotenv').config({ path: './backend/.env' });
    
    const resDb = await pool.query("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1");
    if (resDb.rows.length === 0) {
      console.log('No admin found');
      return;
    }
    const adminId = resDb.rows[0].id;
    const token = jwt.sign({ id: adminId, role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log('Generated token for', adminId);

    // 2. Perform the upload using native Node http to avoid axios/form-data dependencies
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\n`),
      Buffer.from('hello world from script!'),
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/drive/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'Authorization': `Bearer ${token}`
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        process.exit();
      });
    });

    req.on('error', e => {
      console.error('Request Error:', e);
      process.exit();
    });

    req.write(body);
    req.end();
  } catch (e) {
    console.error(e);
  }
}
test();
