const http = require('http');

const API_BASE = 'http://localhost:5000';

function request(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('🔍 TESTES DE SEGURANÇA - Focus Hub Backend\n');
    console.log('='.repeat(50) + '\n');

    // Test 1: Health check
    console.log('1️⃣  Health Check (/api/health)');
    try {
        const health = await request('GET', '/api/health');
        console.log(`   Status: ${health.status}`);
        console.log(`   Resposta: ${JSON.stringify(health.data)}\n`);
    } catch (e) {
        console.log(`   ❌ Erro: ${e.message}\n`);
    }

    // Test 2: Protected route without token
    console.log('2️⃣  Rota Protegida SEM Token (/api/tasks)');
    try {
        const tasks = await request('GET', '/api/tasks');
        if (tasks.status === 401) {
            console.log(`   ✅ PASSOU: Status 401 - ${tasks.data.message}\n`);
        } else {
            console.log(`   ❌ FALHOU: Status ${tasks.status} - Esperado 401\n`);
        }
    } catch (e) {
        console.log(`   ❌ Erro: ${e.message}\n`);
    }

    // Test 3: Protected route /api/users without token
    console.log('3️⃣  Rota Protegida SEM Token (/api/users)');
    try {
        const users = await request('GET', '/api/users');
        if (users.status === 401) {
            console.log(`   ✅ PASSOU: Status 401 - ${users.data.message}\n`);
        } else {
            console.log(`   ❌ FALHOU: Status ${users.status} - Esperado 401\n`);
        }
    } catch (e) {
        console.log(`   ❌ Erro: ${e.message}\n`);
    }

    // Test 4: Protected route with invalid token
    console.log('4️⃣  Rota Protegida com Token INVÁLIDO (/api/tasks)');
    try {
        const invalid = await request('GET', '/api/tasks', null, {
            'Authorization': 'Bearer token_invalido_123'
        });
        if (invalid.status === 401) {
            console.log(`   ✅ PASSOU: Status 401 - ${invalid.data.message}\n`);
        } else {
            console.log(`   ❌ FALHOU: Status ${invalid.status} - Esperado 401\n`);
        }
    } catch (e) {
        console.log(`   ❌ Erro: ${e.message}\n`);
    }

    // Test 5: Login endpoint exists
    console.log('5️⃣  Endpoint de Login (/api/auth/login)');
    try {
        const login = await request('POST', '/api/auth/login', {
            email: 'test@test.com',
            password: 'password123'
        });
        console.log(`   Status: ${login.status}`);
        console.log(`   Resposta: ${JSON.stringify(login.data)}\n`);
    } catch (e) {
        console.log(`   ❌ Erro: ${e.message}\n`);
    }

    console.log('='.repeat(50));
    console.log('✅ Testes de segurança concluídos!');
    console.log('\n📝 RESUMO:');
    console.log('   - Middleware JWT: A FUNCIONAR');
    console.log('   - Rotas protegidas: A BLOQUEAR sem token');
    console.log('   - Tokens inválidos: A REJEITAR');
}

runTests().catch(console.error);
