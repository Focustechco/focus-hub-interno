/**
 * Focus Hub - Comprehensive Backend Test Script
 * Tests all CRUD operations for all routes
 * Run with: node backend/scripts/test-all-routes.js
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

// Test user credentials (should exist in DB)
const TEST_USER = {
    email: 'admin@focus.co',
    password: 'password'
};

let authToken = '';
let testUserId = '';

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000
});

// Add auth header to all requests after login
api.interceptors.request.use(config => {
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
});

const log = (message, type = 'info') => {
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warn: '⚠️' };
    console.log(`${icons[type]} ${message}`);
};

const testRoute = async (name, method, url, data = null, expectedStatus = [200, 201]) => {
    try {
        const config = { method, url };
        if (data) config.data = data;

        const res = await api.request(config);

        if (expectedStatus.includes(res.status)) {
            log(`${name}: PASSED (${res.status})`, 'success');
            return res.data;
        } else {
            log(`${name}: UNEXPECTED STATUS ${res.status}`, 'warn');
            return res.data;
        }
    } catch (err) {
        if (err.response && expectedStatus.includes(err.response.status)) {
            log(`${name}: PASSED (${err.response.status})`, 'success');
            return err.response.data;
        }
        log(`${name}: FAILED - ${err.message}`, 'error');
        return null;
    }
};

async function runTests() {
    console.log('\n========================================');
    console.log('    FOCUS HUB - COMPREHENSIVE TEST');
    console.log('========================================\n');

    // 1. Health Check
    log('Testing Health Check...');
    await testRoute('Health Check', 'get', '/health');

    // 2. Authentication
    log('\n--- AUTHENTICATION ---');
    try {
        const authRes = await api.post('/auth/login', TEST_USER);
        authToken = authRes.data.token;
        testUserId = authRes.data.user.id;
        log('Login: PASSED', 'success');
    } catch (err) {
        log('Login: FAILED - Cannot continue without auth', 'error');
        console.log('Make sure the backend is running and test user exists.');
        return;
    }

    // 3. Daily Checklist Routes
    log('\n--- DAILY CHECKLIST ---');
    const todayStr = new Date().toISOString().split('T')[0];

    await testRoute('GET Daily Checklist', 'get', `/daily-checklist?userId=${testUserId}&date=${todayStr}`);

    const newItem = await testRoute('POST Daily Checklist', 'post', '/daily-checklist', {
        userId: testUserId,
        text: 'Test Task from Script',
        date: todayStr
    });

    if (newItem && newItem.id) {
        await testRoute('PUT Daily Checklist', 'put', `/daily-checklist/${newItem.id}`, { completed: true });
        await testRoute('DELETE Daily Checklist', 'delete', `/daily-checklist/${newItem.id}`);
    }

    // 4. Notifications Routes
    log('\n--- NOTIFICATIONS ---');
    await testRoute('GET Notifications', 'get', `/notifications?userId=${testUserId}`);

    const newNotification = await testRoute('POST Notification', 'post', '/notifications', {
        userId: testUserId,
        type: 'TASK_ASSIGNED',
        message: 'Test notification from script',
        linkTo: 'tasks'
    });

    if (newNotification && newNotification.id) {
        await testRoute('PUT Mark as Read', 'put', `/notifications/${newNotification.id}/read`);
        await testRoute('DELETE Notification', 'delete', `/notifications/${newNotification.id}`);
    }

    // 5. Focus Links Routes
    log('\n--- FOCUS LINKS ---');
    await testRoute('GET Links', 'get', '/tools/links');

    const newLink = await testRoute('POST Link', 'post', '/tools/links', {
        title: 'Test Link',
        description: 'Test Description',
        url: 'https://test.com',
        icon: 'Globe'
    });

    if (newLink && newLink.id) {
        await testRoute('PUT Link', 'put', `/tools/links/${newLink.id}`, { title: 'Updated Test Link' });
        await testRoute('DELETE Link', 'delete', `/tools/links/${newLink.id}`);
    }

    // 6. Access Groups Routes
    log('\n--- ACCESS GROUPS ---');
    await testRoute('GET Access Groups', 'get', '/tools/access-groups');

    const newGroup = await testRoute('POST Access Group', 'post', '/tools/access-groups', {
        title: 'Test Group',
        description: 'Test Description',
        category: 'Test'
    });

    if (newGroup && newGroup.id) {
        await testRoute('PUT Access Group', 'put', `/tools/access-groups/${newGroup.id}`, { name: 'Updated Group' });

        // Add credential to group
        const newCred = await testRoute('POST Credential', 'post', `/tools/access-groups/${newGroup.id}/credentials`, {
            serviceName: 'Test Service',
            username: 'testuser',
            password: 'testpass',
            url: 'https://test.com'
        });

        if (newCred && newCred.id) {
            await testRoute('PUT Credential', 'put', `/tools/credentials/${newCred.id}`, { serviceName: 'Updated Service' });
            await testRoute('DELETE Credential', 'delete', `/tools/credentials/${newCred.id}`);
        }

        await testRoute('DELETE Access Group', 'delete', `/tools/access-groups/${newGroup.id}`);
    }

    // 7. Existing Routes (Quick Check)
    log('\n--- EXISTING ROUTES ---');
    await testRoute('GET Tasks', 'get', '/tasks');
    await testRoute('GET Check-ins', 'get', '/checkins');
    await testRoute('GET Posts', 'get', '/posts');
    await testRoute('GET Goals', 'get', '/goals');
    await testRoute('GET Users', 'get', '/users');

    console.log('\n========================================');
    console.log('         TEST COMPLETE');
    console.log('========================================\n');
}

runTests().catch(console.error);
