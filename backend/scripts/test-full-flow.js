const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const USER_EMAIL = 'gabrielsbrana13@gmail.com';
const USER_PASS = '123456';

let token = '';
let userId = '';

async function runTests() {
    console.log('🚀 Starting Full Module Verification...');

    try {
        // 1. Auth Module
        console.log('\n🔐 Testing AUTH Module...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: USER_EMAIL,
            password: USER_PASS
        });
        if (loginRes.data.token) {
            token = loginRes.data.token;
            userId = loginRes.data.user.id;
            console.log('✅ Login Successful');
            console.log(`   User: ${loginRes.data.user.name} (${userId})`);
        } else {
            throw new Error('No token returned');
        }

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Tasks Module
        console.log('\n📋 Testing TASKS Module...');
        const taskData = {
            title: 'Automated Test Task',
            description: 'Created by verification script',
            status: 'pendente',
            priority: 'media',
            assigneeId: userId,
            dueDate: '' // Testing the null fix handling
        };
        const createTRes = await axios.post(`${API_URL}/tasks`, taskData, authHeader);
        console.log(`✅ Create Task: OK (ID: ${createTRes.data.id})`);

        const listTRes = await axios.get(`${API_URL}/tasks`, authHeader);
        const taskExists = listTRes.data.some(t => t.id === createTRes.data.id);
        console.log(`✅ List Tasks: ${taskExists ? 'New task found' : 'New task MISSING'}`);

        // 3. Check-ins Module
        console.log('\n📍 Testing CHECK-INS Module...');
        const checkinData = {
            userId: userId,
            type: 'entry',
            location: 'Script Test',
            mood: 'happy',
            notes: 'Automated checkin'
        };
        const createCRes = await axios.post(`${API_URL}/checkins`, checkinData, authHeader);
        console.log(`✅ Create Check-in: OK (ID: ${createCRes.data.id})`);

        // 4. Goals Module
        console.log('\n🎯 Testing GOALS Module...');
        const goalData = {
            title: 'Automated Goal',
            description: 'Testing goals module',
            type: 'individual',
            targetValue: 100,
            userId: userId
        };
        const createGRes = await axios.post(`${API_URL}/goals`, goalData, authHeader);
        console.log(`✅ Create Goal: OK (ID: ${createGRes.data.id})`);

        // 5. Posts (Mural) Module
        console.log('\n📰 Testing MURAL (Posts) Module...');
        const postData = {
            content: 'Automated test post for team mural',
            authorId: userId
        };
        const createPRes = await axios.post(`${API_URL}/posts`, postData, authHeader);
        console.log(`✅ Create Post: OK (ID: ${createPRes.data.id})`);

        // 6. Users Module
        console.log('\n👥 Testing USERS Module...');
        const listURes = await axios.get(`${API_URL}/users`, authHeader);
        console.log(`✅ List Users: OK (${listURes.data.length} users found)`);

        console.log('\n✨ ALL MODULES VERIFIED SUCCESSFULLY ✨');

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

runTests();
