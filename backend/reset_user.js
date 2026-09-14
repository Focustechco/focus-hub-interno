const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });

async function resetUser() {
  const hash = bcrypt.hashSync('admin123', 10);
  
  // Update first Adriano Leal to admin with easy email
  const res = await pool.query(
    "UPDATE users SET email = $1, password = $2, role = $3 WHERE id = $4 RETURNING id, name, email, role",
    ['adriano@focushub.com', hash, 'ADMIN', 'u1783982466673']
  );
  console.log('Usuário atualizado:', res.rows);
  
  await pool.end();
}

resetUser().catch(console.error);
