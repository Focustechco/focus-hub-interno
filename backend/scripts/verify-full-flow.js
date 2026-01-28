const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function runVerification() {
    try {
        console.log('--- Starting Full Flow Verification ---');

        // 1. Register User
        console.log('\n1. Registering new user...');
        const userEmail = `test${Date.now()}@example.com`;
        const registerRes = await axios.post(`${API_URL}/auth/register`, {
            name: 'Test User',
            email: userEmail,
            password: 'password123',
            role: 'USER',
            sector: 'Tech',
            jobTitle: 'Tester'
        });
        const { token, user } = registerRes.data;
        console.log('   ✅ Registered:', user.email);

        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Create Task with Subtasks
        console.log('\n2. Creating Task with Subtasks...');
        const taskId = 't' + Date.now();
        const taskData = {
            id: taskId,
            title: 'Verify Backend Logic',
            description: 'Testing all endpoints',
            status: 'pendente',
            priority: 'alta',
            assigneeId: user.id,
            estimatedTime: 60,
            dueDate: new Date().toISOString(),
            subtasks: [
                { id: 'st' + Date.now() + '1', text: 'Check registration', completed: true },
                { id: 'st' + Date.now() + '2', text: 'Check tasks', completed: false }
            ]
        };
        await axios.post(`${API_URL}/tasks`, taskData, authHeaders);
        console.log('   ✅ Task Created');

        // 3. Verify Task Created
        const tasksRes = await axios.get(`${API_URL}/tasks`, authHeaders);
        const createdTask = tasksRes.data.find(t => t.id === taskId);
        if (createdTask && createdTask.subtasks.length === 2) {
            console.log('   ✅ Task Verification: Found with 2 subtasks');
        } else {
            console.error('   ❌ Task Verification Failed:', createdTask);
        }

        // 4. Update Task (Status & Subtasks)
        console.log('\n4. Updating Task Status & Subtasks...');
        const updatedSubtasks = taskData.subtasks.map(st => ({ ...st, completed: true }));
        await axios.put(`${API_URL}/tasks/${taskId}`, {
            ...taskData,
            status: 'em_progresso',
            subtasks: updatedSubtasks
        }, authHeaders);
        console.log('   ✅ Task Updated');

        // Verify Subtask Update
        const updatedTaskRes = await axios.get(`${API_URL}/tasks`, authHeaders);
        const updatedTask = updatedTaskRes.data.find(t => t.id === taskId);
        if (updatedTask && updatedTask.subtasks.every(st => st.completed)) {
            console.log('   ✅ Subtask Update Verification: All subtasks completed');
        } else {
            console.error('   ❌ Subtask Update Verification Failed:', updatedTask.subtasks);
        }

        // 5. Create Check-in
        console.log('\n5. Creating Check-in...');
        await axios.post(`${API_URL}/checkins`, {
            userId: user.id,
            type: 'entry',
            location: 'Office',
            mood: 'happy',
            notes: 'Starting verification'
        }, authHeaders);
        console.log('   ✅ Check-in Created');

        // 6. Create Post
        console.log('\n6. Creating Post...');
        await axios.post(`${API_URL}/posts`, {
            authorId: user.id,
            content: 'Hello World from Test Script!'
        }, authHeaders);
        console.log('   ✅ Post Created');

        // 7. Create Goal
        console.log('\n7. Creating Goal...');
        await axios.post(`${API_URL}/goals`, {
            title: 'Pass Verification',
            description: 'Ensure backend works',
            progress: 50,
            status: 'active',
            dueDate: new Date().toISOString(),
            sector: 'Tech'
        }, authHeaders);
        console.log('   ✅ Goal Created');

        console.log('\n--- Verification Complete: SUCCESS ---');

    } catch (error) {
        console.error('\n❌ Verification Failed:', error.response ? error.response.data : error.message);
    }
}

runVerification();
