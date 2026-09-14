const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const schemaPath = path.join(__dirname, '../schema.sql');

async function initDb() {
    try {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log('Running schema...');
        await pool.query(schema);
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    } finally {
        await pool.end();
    }
}

initDb();
