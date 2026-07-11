const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function applySchema() {
    try {
        console.log('Connecting to database...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Executing schema.sql...');
        await pool.query(schemaSql);
        
        console.log('Schema applied successfully!');
    } catch (err) {
        console.error('Error applying schema:', err);
    } finally {
        pool.end();
    }
}

applySchema();
