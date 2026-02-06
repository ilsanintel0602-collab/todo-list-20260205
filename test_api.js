const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
        });
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('Starting API Verification...');

    // 1. Create Task
    console.log('\n[1] Creating Task...');
    const createRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/tasks',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, {
        text: 'Test Task',
        date: '2026-02-06',
        priority: 'high',
        createdAt: new Date().toISOString()
    });

    if (createRes.statusCode !== 200 || createRes.body.data.priority !== 'high') {
        console.error('FAILED: Task creation or priority mismatch', createRes.body);
        return;
    }
    const taskId = createRes.body.data.id;
    console.log('PASSED: Task created with ID', taskId);

    // 2. Edit Task (Text & Priority)
    console.log('\n[2] Editing Task...');
    const editRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/tasks/${taskId}`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
    }, {
        text: 'Updated Task Text',
        priority: 'low',
        date: '2026-02-07'
    });

    if (editRes.statusCode !== 200) {
        console.error('FAILED: Task update', editRes.body);
        return;
    }
    console.log('PASSED: Task update successful');

    // 3. Verify Update via GET
    console.log('\n[3] Verifying Update...');
    const getRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/tasks',
        method: 'GET'
    });

    const task = getRes.body.data.find(t => t.id === taskId);
    if (task.text === 'Updated Task Text' && task.priority === 'low' && task.date === '2026-02-07') {
        console.log('PASSED: All fields updated correctly.');
    } else {
        console.error('FAILED: Verification mismatch', task);
    }

    // 4. Cleanup
    console.log('\n[4] Cleaning up...');
    await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/tasks/${taskId}`,
        method: 'DELETE'
    });
    console.log('PASSED: Cleanup done.');
    console.log('\nALL TESTS PASSED!');
}

runTests().catch(console.error);
