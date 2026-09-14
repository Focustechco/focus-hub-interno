const bcrypt = require('bcryptjs');
const { pool } = require('./backend/config/db');

async function createAdmin() {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        
        // Verifica se o usuário já existe
        const res = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@focushub.com']);
        if (res.rows.length > 0) {
            await pool.query('UPDATE users SET password = $1, is_approved = true, role = $2 WHERE email = $3', [hashedPassword, 'ADMIN', 'admin@focushub.com']);
            console.log('Senha do admin atualizada para admin123');
        } else {
            await pool.query(
                `INSERT INTO users (id, name, email, password, role, is_approved, join_date)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                ['u_admin_' + Date.now(), 'Admin Focus', 'admin@focushub.com', hashedPassword, 'ADMIN', true]
            );
            console.log('Admin criado: admin@focushub.com / admin123');
        }
    } catch (e) {
        console.error('Erro:', e);
    } finally {
        process.exit(0);
    }
}

createAdmin();
