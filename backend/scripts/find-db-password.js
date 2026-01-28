const { Client } = require('pg');

const passwords = ['password', 'postgres', 'admin', '123456', 'root', ''];

async function testPassword(password) {
    const client = new Client({
        user: 'postgres',
        password: password,
        host: 'localhost',
        port: 4242,
        database: 'focus_hub',
    });

    try {
        await client.connect();
        console.log(`✅ Success! Password is: "${password}"`);
        await client.end();
        return true;
    } catch (err) {
        // console.log(`❌ Failed with "${password}": ${err.message}`);
        return false;
    }
}

async function run() {
    console.log('Testing passwords...');
    for (const pwd of passwords) {
        if (await testPassword(pwd)) {
            process.exit(0);
        }
    }
    console.log('❌ All passwords failed.');
}

run();
