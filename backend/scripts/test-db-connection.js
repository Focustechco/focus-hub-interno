const { Client } = require('pg');

async function testPort(port) {
    const client = new Client({
        user: 'postgres',
        password: 'password',
        host: 'localhost',
        port: port,
        database: 'focus_hub',
    });

    try {
        await client.connect();
        console.log(`✅ Connected successfully on port ${port}`);
        await client.end();
        return true;
    } catch (err) {
        console.log(`❌ Failed to connect on port ${port}: ${err.message}`);
        return false;
    }
}

async function run() {
    console.log('Testing DB connection...');
    await testPort(5433);
    await testPort(5432);
}

run();
