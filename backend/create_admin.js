const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function createAdmin() {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        await pool.query(
            `INSERT INTO users (id, name, email, password, role, is_approved)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            ['u' + Date.now(), 'Admin do Sistema', 'admin@focushub.com', hashedPassword, 'ADMIN', true]
        );
        console.log('Admin user created successfully: admin@focushub.com / admin123');
    } catch (e) {
        console.error('Error creating admin:', e);
    } finally {
        pool.end();
    }
}
createAdmin();
