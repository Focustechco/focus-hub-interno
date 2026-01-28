const { pool } = require('../config/db');

async function migrate() {
    try {
        console.log('--- Starting Migration ---');

        // Add check_out_time
        try {
            await pool.query('ALTER TABLE check_ins ADD COLUMN check_out_time TIMESTAMP');
            console.log('✅ Added check_out_time column');
        } catch (e) {
            if (e.code === '42701') { // duplicate_column
                console.log('ℹ️ check_out_time column already exists');
            } else {
                console.error('❌ Failed to add check_out_time:', e.message);
            }
        }

        // Add daily_report
        try {
            await pool.query('ALTER TABLE check_ins ADD COLUMN daily_report TEXT');
            console.log('✅ Added daily_report column');
        } catch (e) {
            if (e.code === '42701') { // duplicate_column
                console.log('ℹ️ daily_report column already exists');
            } else {
                console.error('❌ Failed to add daily_report:', e.message);
            }
        }

        console.log('--- Migration Completed ---');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();
