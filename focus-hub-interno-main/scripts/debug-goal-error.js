import axios from 'axios';

const API_URL = 'https://focus-hub-api.onrender.com/api';
// Use the approved user
const TEST_USER = {
    email: 'ana@focus.co',
    password: '123456'
};

async function login() {
    try {
        const res = await axios.post(`${API_URL}/auth/login`, TEST_USER);
        console.log('✅ Login successful. User ID:', res.data.user.id);
        return { token: res.data.token, userId: res.data.user.id };
    } catch (e) {
        console.error('Login failed:', e.message);
        return null;
    }
}

async function tryCreateGoal(token, userIdToSend) {
    console.log(`\nTesting POST /goals with userId: '${userIdToSend}'...`);
    const payload = {
        title: 'Debug Goal',
        description: 'Testing userId FK constraint',
        status: 'pending',
        current: 0,
        target: 100,
        metric: '%',
        dueDate: new Date().toISOString(),
        sector: 'Tech',
        period: 'monthly',
        type: 'Team',
        userId: userIdToSend
    };

    try {
        const res = await axios.post(`${API_URL}/goals`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Goal created successfully!');
    } catch (error) {
        console.error('❌ Goal creation failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

async function run() {
    const auth = await login();
    if (auth) {
        // 1. Try with the placeholder (mimicking current frontend)
        await tryCreateGoal(auth.token, 'user-id-placeholder');

        // 2. Try with actual user ID
        await tryCreateGoal(auth.token, auth.userId);
    }
}

run();
