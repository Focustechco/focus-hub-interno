const pool = require('./config/db');
pool.query("UPDATE users SET sector = 'Tech' WHERE sector = 'TI'").then(res => {
    console.log('Updated', res.rowCount);
    process.exit(0);
}).catch(console.error);
