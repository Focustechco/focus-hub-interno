const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const USER_EMAIL = 'gabrielsbrana13@gmail.com';
const USER_PASS = '123456';

let token = '';
let userId = '';

async function comprehensiveTest() {
    console.log('🚀 COMPREHENSIVE APPLICATION VERIFICATION');
    console.log('='.repeat(60));

    try {
        // 1. AUTH MODULE
        console.log('\n📌 MODULE 1: AUTHENTICATION');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: USER_EMAIL,
            password: USER_PASS
        });
        token = loginRes.data.token;
        userId = loginRes.data.user.id;
        console.log(`✅ Login: ${loginRes.data.user.name} (${userId})`);

        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        // 2. CHECK-IN MODULE - FULL FLOW
        console.log('\n📌 MODULE 2: CHECK-IN (Full Flow)');

        // 2a. Entry
        const entry1 = await axios.post(`${API_URL}/checkins`, {
            userId, type: 'entry', location: 'Office', mood: 'happy', notes: 'First entry'
        }, authHeader);
        console.log(`✅ Check-in Entry: ${entry1.data.id} at ${entry1.data.checkInTime}`);

        // 2b. Exit
        const exit1 = await axios.put(`${API_URL}/checkins/${entry1.data.id}`, {
            checkOutTime: new Date().toISOString()
        }, authHeader);
        console.log(`✅ Check-out: ${exit1.data.id} at ${exit1.data.checkOutTime}`);

        // 2c. Second Entry (after exit)
        const entry2 = await axios.post(`${API_URL}/checkins`, {
            userId, type: 'entry', location: 'Office', mood: 'neutral', notes: 'Second entry'
        }, authHeader);
        console.log(`✅ Second Entry: ${entry2.data.id} at ${entry2.data.checkInTime}`);

        // 2d. List all check-ins
        const checkinsRes = await axios.get(`${API_URL}/checkins`, authHeader);
        console.log(`✅ List Check-ins: ${checkinsRes.data.length} records found`);

        // 3. TASKS MODULE - CRUD
        console.log('\n📌 MODULE 3: TASKS (CRUD)');

        // 3a. Create
        const task1 = await axios.post(`${API_URL}/tasks`, {
            title: 'Test Task',
            description: 'Automated test task',
            status: 'pendente',
            priority: 'alta',
            assigneeId: userId,
            dueDate: '2025-12-20'
        }, authHeader);
        console.log(`✅ Create Task: ${task1.data.id}`);

        // 3b. List
        const tasksRes = await axios.get(`${API_URL}/tasks`, authHeader);
        console.log(`✅ List Tasks: ${tasksRes.data.length} tasks`);

        // 3c. Update
        const updatedTask = await axios.put(`${API_URL}/tasks/${task1.data.id}`, {
            title: 'Updated Test Task',
            status: 'em_progresso',
            priority: 'alta',
            assigneeId: userId
        }, authHeader);
        console.log(`✅ Update Task: Status changed to em_progresso`);

        // 4. GOALS MODULE
        console.log('\n📌 MODULE 4: GOALS');

        const goal1 = await axios.post(`${API_URL}/goals`, {
            title: 'Revenue Goal Q1',
            description: 'Increase revenue by 20%',
            type: 'company',
            targetValue: 100000,
            userId: userId
        }, authHeader);
        console.log(`✅ Create Goal: ${goal1.data.id}`);

        const goalsRes = await axios.get(`${API_URL}/goals`, authHeader);
        console.log(`✅ List Goals: ${goalsRes.data.length} goals`);

        // 5. MURAL (POSTS) MODULE
        console.log('\n📌 MODULE 5: MURAL/POSTS');

        const post1 = await axios.post(`${API_URL}/posts`, {
            content: 'Team announcement: Comprehensive testing in progress!',
            authorId: userId
        }, authHeader);
        console.log(`✅ Create Post: ${post1.data.id}`);

        const postsRes = await axios.get(`${API_URL}/posts`, authHeader);
        console.log(`✅ List Posts: ${postsRes.data.length} posts`);

        // 6. USERS MODULE
        console.log('\n📌 MODULE 6: USERS');

        const usersRes = await axios.get(`${API_URL}/users`, authHeader);
        console.log(`✅ List Users: ${usersRes.data.length} users`);

        // 7. EDGE CASES
        console.log('\n📌 MODULE 7: EDGE CASES');

        // 7a. Task with empty due date
        const taskNoDue = await axios.post(`${API_URL}/tasks`, {
            title: 'Task without due date',
            description: 'Testing null date handling',
            status: 'pendente',
            priority: 'baixa',
            assigneeId: userId,
            dueDate: ''
        }, authHeader);
        console.log(`✅ Task with empty dueDate: ${taskNoDue.data.id}`);

        // 7b. Check-in with daily report
        const reportUpdate = await axios.put(`${API_URL}/checkins/${exit1.data.id}`, {
            dailyReport: 'Completed comprehensive testing of all modules. All systems operational.'
        }, authHeader);
        console.log(`✅ Daily Report added to check-in: ${exit1.data.id}`);

        console.log('\n' + '='.repeat(60));
        console.log('✨ ALL MODULES VERIFIED SUCCESSFULLY ✨');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
            console.error('URL:', error.config.url);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

comprehensiveTest();
