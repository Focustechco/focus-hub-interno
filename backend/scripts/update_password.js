const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    const email = 'gabrielsbrana13@gmail.com';
    const newPassword = '1234';

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const res = await pool.query(
            "UPDATE users SET password = $1 WHERE email = $2 RETURNING id, name, email",
            [hashedPassword, email]
        );

        if (res.rowCount > 0) {
            console.log('Password updated successfully for:', res.rows[0]);
        } else {
            console.log('User not found.');
        }
    } catch (err) {
        console.error('Error updating password:', err);
    } finally {
        pool.end();
    }
}

resetPassword();
