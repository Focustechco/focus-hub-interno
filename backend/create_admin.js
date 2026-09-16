const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function setupAdmins() {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        
        // 1. Update adrianobarrosleal96@gmail.com
        await pool.query(
            `UPDATE users 
             SET password = $1, role = 'ADMIN', is_approved = true 
             WHERE email = $2`,
            [hashedPassword, 'adrianobarrosleal96@gmail.com']
        );
        console.log('Updated: adrianobarrosleal96@gmail.com -> admin123');

        // 2. Update admin@focus.co
        await pool.query(
            `UPDATE users 
             SET password = $1, role = 'ADMIN', is_approved = true 
             WHERE email = $2`,
            [hashedPassword, 'admin@focus.co']
        );
        console.log('Updated: admin@focus.co -> admin123');

        // 3. Upsert admin@focushub.com
        await pool.query(
            `INSERT INTO users (id, name, email, password, role, is_approved)
             VALUES ('admin-hub', 'Admin Focus Hub', 'admin@focushub.com', $1, 'ADMIN', true)
             ON CONFLICT (email) DO UPDATE SET password = $1, role = 'ADMIN', is_approved = true`,
            [hashedPassword]
        );
        console.log('Updated: admin@focushub.com -> admin123');

    } catch (e) {
        console.error('Error setting admins:', e);
    } finally {
        pool.end();
    }
}
setupAdmins();
