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

async function testToolsApi() {
    try {
        console.log('--- Starting Focus Tools API Test ---');

        // 1. Create a Link
        console.log('1. Creating a Link...');
        const linkRes = await request('POST', '/tools/links', {
            title: 'Test Link',
            url: 'https://example.com',
            category: 'General',
            icon: 'Globe',
            userId: 'test-user'
        });
        console.log('   ✅ Link Created:', linkRes.id);

        // 2. Fetch Links
        console.log('2. Fetching Links...');
        const links = await request('GET', '/tools/links');
        const foundLink = links.find(l => l.id === linkRes.id);
        if (foundLink) {
            console.log('   ✅ Link Found in List');
        } else {
            console.error('   ❌ Link Not Found');
        }

        // 3. Create Access Group
        console.log('3. Creating Access Group...');
        const groupRes = await request('POST', '/tools/access-groups', {
            title: 'Test Group',
            description: 'Test Description',
            category: 'General'
        });
        console.log('   ✅ Access Group Created:', groupRes.id);

        // 4. Add Credential
        console.log('4. Adding Credential to Group...');
        const credRes = await request('POST', `/tools/access-groups/${groupRes.id}/credentials`, {
            serviceName: 'Test Service',
            username: 'admin',
            password: 'password',
            url: 'https://service.com',
            notes: 'Test Notes'
        });
        console.log('   ✅ Credential Added:', credRes.id);

        console.log('--- Test Completed Successfully ---');

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

// Wait a bit for server to start if we just launched it
setTimeout(testToolsApi, 1000);
