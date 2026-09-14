const { pool } = require('../config/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MOCK_USERS = [
    { id: 'u1', name: 'Ana Silva', email: 'ana@focus.co', role: 'admin', avatar_url: 'https://i.pravatar.cc/150?u=u1', sector: 'Administração', job_title: 'CEO', bio: 'Liderando a Focus para o futuro.', join_date: '2021-03-15' },
    { id: 'u2', name: 'Bruno Costa', email: 'bruno@focus.co', role: 'user', avatar_url: 'https://i.pravatar.cc/150?u=u2', sector: 'Tech', job_title: 'Desenvolvedor Full Stack', bio: 'Transformando café em código.', join_date: '2022-07-20' },
    { id: 'u3', name: 'Carla Dias', email: 'carla@focus.co', role: 'user', avatar_url: 'https://i.pravatar.cc/150?u=u3', sector: 'Criativo', job_title: 'Designer UI/UX', bio: 'Criando experiências que encantam.', join_date: '2022-01-10' },
    { id: 'u4', name: 'Daniel Alves', email: 'daniel@focus.co', role: 'collaborator', avatar_url: 'https://i.pravatar.cc/150?u=u4', sector: 'Comercial', job_title: 'Executivo de Vendas', bio: 'Conectando soluções a clientes.', join_date: '2023-05-02' },
];

const bcrypt = require('bcryptjs');

async function seed() {
    try {
        console.log('Seeding users...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123456', salt);

        for (const user of MOCK_USERS) {
            await pool.query(
                `INSERT INTO users (id, name, email, password, role, avatar_url, sector, job_title, bio, join_date) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (id) DO UPDATE SET password = $4`,
                [user.id, user.name, user.email, hashedPassword, user.role, user.avatar_url, user.sector, user.job_title, user.bio, user.join_date]
            );
        }
        console.log('Seeding complete! Default password is "123456"');
        console.log('Seeding complete!');
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        await pool.end();
    }
}

seed();
