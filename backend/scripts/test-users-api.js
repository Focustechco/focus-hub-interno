const http = require('http');

const API_PORT = 5000;
const API_HOST = 'localhost';

function request(method, path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject({ statusCode: res.statusCode, body: parsed });
                    }
                } catch (e) {
                    reject({ statusCode: res.statusCode, body: body, error: e });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testUsersApi() {
    try {
        console.log('--- Starting Users API Test ---');

        // 1. Get All Users
        console.log('1. Fetching all users...');
        const users = await request('GET', '/users');
        console.log(`   ✅ Fetched ${users.length} users`);

        if (users.length === 0) {
            console.log('   ⚠️ No users found to update. Skipping.');
            return;
        }

        // 2. Update a User
        const userToUpdate = users[0];
        console.log(`2. Updating user: ${userToUpdate.name} (${userToUpdate.id})...`);

        const newBio = `Updated bio at ${new Date().toISOString()}`;
        const updateRes = await request('PUT', `/users/${userToUpdate.id}`, {
            ...userToUpdate,
            bio: newBio
        });

        if (updateRes.bio === newBio) {
            console.log('   ✅ User Bio Updated Successfully');
        } else {
            console.error('   ❌ User Update Failed', updateRes);
        }

        console.log('--- Test Completed Successfully ---');

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

// Wait a bit for server to start if we just launched it
setTimeout(testUsersApi, 1000);
