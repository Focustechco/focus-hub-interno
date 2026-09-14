const { pool } = require('./backend/config/db');

async function addUsers() {
    try {
        await pool.query("INSERT INTO users (id, name, email, role, job_title, sector) VALUES ('u2', 'Maria Silva', 'maria@focus.com', 'manager', 'Gerente de Vendas', 'Comercial') ON CONFLICT DO NOTHING;");
        await pool.query("INSERT INTO users (id, name, email, role, job_title, sector) VALUES ('u3', 'João Souza', 'joao@focus.com', 'user', 'Analista', 'Marketing') ON CONFLICT DO NOTHING;");
        console.log('Users added successfully.');
    } catch (e) {
        console.error('Error adding users:', e);
    } finally {
        process.exit(0);
    }
}

addUsers();
