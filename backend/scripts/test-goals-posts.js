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

async function testGoalsAndPosts() {
    try {
        console.log('--- Starting Goals & Posts Persistence Test ---');

        // 1. Update a Goal
        console.log('1. Updating a Goal...');
        // Assuming 'g-company-csat' exists from seed or we pick one
        const goals = await request('GET', '/goals');
        if (goals.length === 0) {
            console.log('   ⚠️ No goals found to update. Skipping.');
        } else {
            const goalToUpdate = goals[0];
            const newProgress = 99;
            const updateRes = await request('PUT', `/goals/${goalToUpdate.id}`, {
                ...goalToUpdate,
                progress: newProgress,
                current: 99, // Assuming mapped to current_value
                target: 100
            });

            if (updateRes.progress === newProgress || updateRes.current === 99) {
                console.log('   ✅ Goal Updated Successfully');
            } else {
                console.error('   ❌ Goal Update Failed', updateRes);
            }
        }

        // 2. Create a Post
        console.log('2. Creating a Post...');
        const postRes = await request('POST', '/posts', {
            authorId: 'u1', // Assuming u1 exists
            content: 'Test Post from Script'
        });
        const postId = postRes.id;
        console.log('   ✅ Post Created:', postId);

        // 3. Pin the Post
        console.log('3. Pinning the Post...');
        const pinRes = await request('PUT', `/posts/${postId}`, {
            isPinned: true
        });

        if (pinRes.isPinned === true) {
            console.log('   ✅ Post Pinned Successfully');
        } else {
            console.error('   ❌ Post Pin Failed', pinRes);
        }

        console.log('--- Test Completed Successfully ---');

    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

// Wait a bit for server to start if we just launched it
setTimeout(testGoalsAndPosts, 1000);
