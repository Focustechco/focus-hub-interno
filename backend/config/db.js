const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', (client) => {
    client.query("SET timezone TO 'America/Sao_Paulo'", (err) => {
        if (err) {
            console.error('Error setting timezone:', err);
        }
    });
    console.log('Connected to the PostgreSQL database');
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
