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

async function testCheckInFlow() {
    try {
        console.log('--- Starting Check-In Flow Test ---');

        // 1. Create a Check-In
        console.log('1. Creating Check-In...');
        const checkInRes = await request('POST', '/checkins', {
            userId: 'u1',
            type: 'entry',
            location: 'Test Office',
            mood: 'happy',
            notes: 'Testing persistence'
        });
        const checkInId = checkInRes.id;
        console.log('   ✅ Check-In Created:', checkInId);

        // 2. Update with Check-Out
        console.log('2. Updating with Check-Out...');
        const checkOutTime = new Date().toISOString();
        const updateRes1 = await request('PUT', `/checkins/${checkInId}`, {
            checkOutTime
        });

        if (updateRes1.checkOutTime === checkOutTime) {
            console.log('   ✅ Check-Out Updated Successfully');
        } else {
            console.error('   ❌ Check-Out Update Failed', updateRes1);
        }

        // 3. Update with Daily Report
        console.log('3. Updating with Daily Report...');
        const reportText = 'This is a test report.';
        const updateRes2 = await request('PUT', `/checkins/${checkInId}`, {
            dailyReport: reportText
        });

        if (updateRes2.dailyReport === reportText) {
            console.log('   ✅ Daily Report Updated Successfully');
        } else {
            console.error('   ❌ Daily Report Update Failed', updateRes2);
        }

        console.log('--- Test Completed Successfully ---');

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

// Wait a bit for server to start if we just launched it
setTimeout(testCheckInFlow, 2000);
