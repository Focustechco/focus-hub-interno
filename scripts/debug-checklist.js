import axios from 'axios';

// Production API
const API_URL = 'https://focus-hub-api.onrender.com/api';

async function testChecklistAPI() {
    console.log('🔍 Testing Daily Checklist API...\n');

    // Step 1: Login to get a token
    console.log('Step 1: Logging in...');
    let token, userId;
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'gabriel@focus.co',
            password: 'focus2024'
        });
        token = loginRes.data.token;
        userId = loginRes.data.user.id;
        console.log('✅ Login successful. User ID:', userId);
    } catch (error) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        return;
    }

    // Step 2: Generate today's date (local time)
    const date = new Date();
    const todayStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    console.log(`\nStep 2: Using date: ${todayStr}`);

    // Step 3: Create a checklist item
    console.log('\nStep 3: Creating a checklist item...');
    let createdItemId;
    try {
        const createRes = await axios.post(
            `${API_URL}/daily-checklist`,
            {
                userId: userId,
                text: 'Debug test item - ' + new Date().toLocaleTimeString(),
                date: todayStr
            },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        createdItemId = createRes.data.id;
        console.log('✅ Item created successfully:');
        console.log('   ID:', createRes.data.id);
        console.log('   Text:', createRes.data.text);
        console.log('   Date:', createRes.data.date);
        console.log('   Completed:', createRes.data.completed);
    } catch (error) {
        console.error('❌ Failed to create item:', error.response?.data || error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        return;
    }

    // Step 4: Fetch checklist items for today
    console.log('\nStep 4: Fetching checklist items for today...');
    try {
        const fetchRes = await axios.get(
            `${API_URL}/daily-checklist?userId=${userId}&date=${todayStr}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log(`✅ Fetched ${fetchRes.data.length} items:`);
        fetchRes.data.forEach((item, index) => {
            console.log(`   ${index + 1}. [${item.completed ? 'x' : ' '}] ${item.text} (${item.date})`);
        });
    } catch (error) {
        console.error('❌ Failed to fetch items:', error.response?.data || error.message);
        return;
    }

    // Step 5: Toggle the item
    console.log('\nStep 5: Toggling item completion...');
    try {
        const toggleRes = await axios.put(
            `${API_URL}/daily-checklist/${createdItemId}`,
            { completed: true },
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log('✅ Item toggled successfully:');
        console.log('   Completed:', toggleRes.data.completed);
    } catch (error) {
        console.error('❌ Failed to toggle item:', error.response?.data || error.message);
        return;
    }

    // Step 6: Fetch again to verify persistence
    console.log('\nStep 6: Fetching again to verify persistence...');
    try {
        const fetchRes2 = await axios.get(
            `${API_URL}/daily-checklist?userId=${userId}&date=${todayStr}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log(`✅ Fetched ${fetchRes2.data.length} items:`);
        fetchRes2.data.forEach((item, index) => {
            console.log(`   ${index + 1}. [${item.completed ? 'x' : ' '}] ${item.text} (${item.date})`);
        });

        const ourItem = fetchRes2.data.find(i => i.id === createdItemId);
        if (ourItem && ourItem.completed) {
            console.log('\n✅ SUCCESS: Item was persisted and toggled correctly!');
        } else {
            console.log('\n⚠️  WARNING: Item state may not have persisted correctly');
        }
    } catch (error) {
        console.error('❌ Failed to fetch items:', error.response?.data || error.message);
        return;
    }

    // Step 7: Clean up - delete the test item
    console.log('\nStep 7: Cleaning up - deleting test item...');
    try {
        await axios.delete(
            `${API_URL}/daily-checklist/${createdItemId}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        console.log('✅ Test item deleted successfully');
    } catch (error) {
        console.error('❌ Failed to delete item:', error.response?.data || error.message);
    }

    console.log('\n✅ All tests completed!');
}

testChecklistAPI().catch(err => {
    console.error('Unexpected error:', err);
});
