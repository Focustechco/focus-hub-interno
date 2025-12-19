const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
// Using the user ID found in earlier logs: gabriel scotto sbrana (u1764292842619)
// But I need to login first to get a token if auth is required?
// server.js protects /api/checkins? Yes.
// So I need to login.

const USER_EMAIL = 'gabrielsbrana13@gmail.com';
const USER_PASS = '123456';

async function testCheckIn() {
    try {
        console.log('🔐 Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: USER_EMAIL,
            password: USER_PASS
        });
        const token = loginRes.data.token;
        const userId = loginRes.data.user.id;
        console.log(`✅ Login OK. User ID: ${userId}`);

        console.log('📍 Attempting POST /api/checkins (Entry)...');
        const checkinData = {
            userId: userId,
            type: 'entry',
            location: 'Debug Script',
            mood: 'neutral',
            notes: 'Testing checkin failure via script'
        };

        const res = await axios.post(`${API_URL}/checkins`, checkinData, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ POST Success! Response Data:', JSON.stringify(res.data, null, 2));

    } catch (error) {
        console.error('❌ POST Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testCheckIn();
