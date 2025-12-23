/**
 * Script para resetar senha diretamente no banco de produção (Neon)
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const EMAIL = 'gabrielsbrana13@gmail.com';
const NEW_PASSWORD = '1234';

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERRO: DATABASE_URL nao definida!');
    process.exit(1);
}

async function resetPassword() {
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Conectando ao banco de dados de producao...');

        const checkUser = await pool.query(
            'SELECT id, name, email, is_approved FROM users WHERE email = $1',
            [EMAIL]
        );

        if (checkUser.rows.length === 0) {
            console.log('Usuario nao encontrado com o email:', EMAIL);
            const allUsers = await pool.query('SELECT id, email, name FROM users');
            console.log('Usuarios existentes:');
            console.table(allUsers.rows);
            return;
        }

        const user = checkUser.rows[0];
        console.log('Usuario encontrado:', user.name);
        console.log('is_approved:', user.is_approved);

        if (user.is_approved === false) {
            console.log('Usuario nao aprovado. Aprovando...');
            await pool.query('UPDATE users SET is_approved = true WHERE id = $1', [user.id]);
            console.log('Usuario aprovado!');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

        await pool.query(
            'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE email = $2',
            [hashedPassword, EMAIL]
        );

        console.log('');
        console.log('===== SENHA RESETADA COM SUCESSO! =====');
        console.log('Email:', EMAIL);
        console.log('Nova senha:', NEW_PASSWORD);
        console.log('');
        console.log('Agora voce pode fazer login no Focus Hub!');

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await pool.end();
    }
}

resetPassword();
