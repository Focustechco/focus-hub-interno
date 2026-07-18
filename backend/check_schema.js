const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });

async function main() {
  // Check columns
  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position
  `);
  console.log('Colunas da tabela users:');
  cols.rows.forEach(r => console.log(' -', r.column_name, ':', r.data_type));
  
  await pool.end();
}

main().catch(console.error);
