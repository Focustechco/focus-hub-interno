const { pool } = require('./backend/config/db');

async function test() {
  try {
    const res = await pool.query("SELECT id FROM users LIMIT 1");
    if (res.rows.length === 0) {
      console.log('No users found');
      process.exit();
    }
    const id = res.rows[0].id;
    console.log('Testing user id:', id);

    const updateRes = await pool.query(
      `UPDATE users 
       SET name = $1, role = $2, sector = $3, job_title = $4, bio = $5, avatar_url = $6, 
           whatsapp = $7, whatsapp_notifications = $8, whatsapp_dnd_start = $9, whatsapp_dnd_end = $10, status = $11
       WHERE id = $12 RETURNING id`,
      ['Test', 'USER', 'TI', 'Dev', '', '', null, null, null, null, 'active', id]
    );
    console.log('Update OK:', updateRes.rows[0]);
    
    // Now try deleting it? Let's just test update first.
  } catch (e) {
    console.error('Update Error:', e);
  }
  process.exit();
}
test();
