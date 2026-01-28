import axios from 'axios';

const API_URL = 'https://focus-hub-api.onrender.com/api';

// Use default admin credentials seeded in database
const ADMIN_USER = {
    email: 'admin@focus.com',
    password: 'admin' // Assuming default seeded password
};

async function login() {
    console.log('Logging in to get token...');
    try {
        const res = await axios.post(`${API_URL}/auth/login`, ADMIN_USER);
        console.log('✅ Login successful.');
        return res.data.token;
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        if (error.response) console.error('Details:', error.response.data);
        return null;
    }
}

async function verifyGoalsEndpoint(token) {
    console.log('\nTesting GET /goals...');
    try {
        const res = await axios.get(`${API_URL}/goals`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ GET /goals working. Status:', res.status);
        return true;
    } catch (error) {
        console.error('❌ GET /goals failed:', error.message);
        return false;
    }
}

async function verifyToolsEndpoint(token) {
    console.log('\nTesting GET /tools/links...');
    try {
        const res = await axios.get(`${API_URL}/tools/links`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ GET /tools/links working. Status:', res.status);

        const sample = res.data[0];
        if (sample) {
            console.log('Sample link keys:', Object.keys(sample));
            if ('link' in sample) {
                console.log('✅ New schema detected ("link" field present). BACKEND IS UPDATED.');
            } else if ('url' in sample) {
                console.log('⚠️ Old schema detected ("url" field present). BACKEND IS NOT UPDATED.');
            } else {
                console.log('❓ Unknown schema:', sample);
            }
        } else {
            console.log('⚠️ No links found to verify schema, but endpoint is active.');
        }
        return true;
    } catch (error) {
        console.error('❌ GET /tools/links failed:', error.message);
        return false;
    }
}

async function runVerification() {
    console.log('Verifying Production API with Auth:', API_URL);
    const token = await login();
    if (!token) return;

    await verifyGoalsEndpoint(token);
    await verifyToolsEndpoint(token);
}

runVerification();
