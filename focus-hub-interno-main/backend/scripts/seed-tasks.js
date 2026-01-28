const { pool } = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MOCK_TASKS = [
    { id: 't1', title: 'Desenvolver página de login', description: 'Criar a interface e a lógica de autenticação.', status: 'em_progresso', priority: 'alta', assignee_id: 'u2', estimated_time: 120, created_at: '2023-10-26T10:00:00Z', due_date: '2023-11-05' },
    { id: 't2', title: 'Definir design system', description: 'Criar componentes reutilizáveis para o projeto.', status: 'concluida', priority: 'alta', assignee_id: 'u3', estimated_time: 240, created_at: '2023-10-25T09:00:00Z', due_date: '2023-11-01' },
    { id: 't3', title: 'Pesquisa de mercado', description: 'Analisar concorrentes.', status: 'pendente', priority: 'media', assignee_id: 'u1', estimated_time: 180, created_at: '2023-10-27T11:00:00Z', due_date: '2023-11-10' },
];

async function seedTasks() {
    try {
        console.log('Seeding tasks...');
        for (const task of MOCK_TASKS) {
            await pool.query(
                `INSERT INTO tasks (id, title, description, status, priority, assignee_id, estimated_time, created_at, due_date) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO NOTHING`,
                [task.id, task.title, task.description, task.status, task.priority, task.assignee_id, task.estimated_time, task.created_at, task.due_date]
            );
        }
        console.log('Tasks seeded!');
    } catch (err) {
        console.error('Seeding tasks failed:', err);
    } finally {
        await pool.end();
    }
}

seedTasks();
