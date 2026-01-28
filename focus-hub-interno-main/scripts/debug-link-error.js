import axios from 'axios';

const API_URL = 'https://focus-hub-api.onrender.com/api';
// Using the admin user that worked in the browser
const ADMIN_USER = {
    email: 'ana@focus.co',
    password: '123456'
};

async function login() {
    console.log('Logging in...');
    try {
        // Try password '123456' first as seen in seed.js
        let res = await axios.post(`${API_URL}/auth/login`, { ...ADMIN_USER, password: '123456' });
        console.log('✅ Login successful (pass: 123456).');
        return res.data.token;
    } catch (e) {
        console.log('Login with 123456 failed, trying "admin"...');
        try {
            let res = await axios.post(`${API_URL}/auth/login`, { ...ADMIN_USER, password: 'admin' });
            console.log('✅ Login successful (pass: admin).');
            return res.data.token;
        } catch (error) {
            console.error('❌ All login attempts failed.');
            if (error.response) console.error(error.response.data);
            return null;
        }
    }
}

async function tryCreateLink(token) {
    console.log('\nTesting POST /tools/links...');
    const payload = {
        title: 'Debug Link',
        description: 'Testing 500 error details',
        link: 'https://example.com',
        icon: 'Target',
        // userId should be extracted from token on server, but we send it if frontend does
        // The frontend sends `userId: currentUser.id`.
        // We'll trust the server to handle it or use the one we send.
        // Let's decode token or just send a dummy one, usually backend relies on req.user.id from token 
        // BUT verify frontend code: FocusToolsScreen sends `userId: currentUser.id`.
        // And routes/tools.js lines 31: const { ..., userId } = req.body;
        // So we MUST send it.
        userId: 'u1' // Assuming 'u1' is admin id from seed.js
    };

    try {
        const res = await axios.post(`${API_URL}/tools/links`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Link created successfully!', res.data);
    } catch (error) {
        console.error('❌ Link creation failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

async function run() {
    const token = await login();
    if (token) {
        await tryCreateLink(token);
    }
}

run();
