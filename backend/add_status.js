require('dotenv').config();
const { pool } = require('./config/db');

async function run() {
    try {
        await pool.query("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active'");
        console.log("Successfully added status column to users table.");
    } catch (e) {
        if (e.code === '42701') {
            console.log("Column 'status' already exists.");
        } else {
            console.error("Error adding column:", e);
        }
    } finally {
        pool.end();
    }
}
run();
