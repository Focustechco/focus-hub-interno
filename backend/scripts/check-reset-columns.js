/**
 * Script para verificar se as colunas de reset de senha existem no banco
 * Execute com: node scripts/check-reset-columns.js
 */

const { pool } = require('../config/db');

async function checkResetColumns() {
    try {
        console.log('Verificando colunas na tabela users...\n');

        const res = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);

        console.log('Colunas encontradas:');
        res.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

        // Verificar se as colunas de reset existem
        const columns = res.rows.map(r => r.column_name);
        const hasResetToken = columns.includes('reset_token');
        const hasResetExpires = columns.includes('reset_token_expires');

        console.log('\n=== DIAGNÓSTICO ===');
        console.log(`reset_token: ${hasResetToken ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);
        console.log(`reset_token_expires: ${hasResetExpires ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);

        if (!hasResetToken || !hasResetExpires) {
            console.log('\n⚠️  PROBLEMA ENCONTRADO!');
            console.log('Execute o seguinte SQL no banco de produção para adicionar as colunas:\n');
            console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;');
            console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;');
        } else {
            console.log('\n✅ Todas as colunas de reset de senha estão presentes!');
        }

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkResetColumns();
