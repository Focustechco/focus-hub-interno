const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:@focusOS19964@db.afxfikprunkspcfgzzil.supabase.co:5432/postgres' });

const queries = `
-- 1. Alterar a tabela users para adicionar birth_date, se não existir
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Tabela announcements (Mural de Avisos)
CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    priority VARCHAR(50) DEFAULT 'Normal',
    expires_at TIMESTAMP,
    pinned BOOLEAN DEFAULT FALSE,
    attachments JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela announcement_reactions
CREATE TABLE IF NOT EXISTS announcement_reactions (
    id VARCHAR(255) PRIMARY KEY,
    announcement_id VARCHAR(255) REFERENCES announcements(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(announcement_id, user_id, reaction_type)
);

-- 4. Tabela announcement_comments
CREATE TABLE IF NOT EXISTS announcement_comments (
    id VARCHAR(255) PRIMARY KEY,
    announcement_id VARCHAR(255) REFERENCES announcements(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id VARCHAR(255) REFERENCES announcement_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela chat_groups
CREATE TABLE IF NOT EXISTS chat_groups (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(255) PRIMARY KEY,
    sender_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    receiver_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    group_id VARCHAR(255) REFERENCES chat_groups(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments JSONB,
    read_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela corporate_channels
CREATE TABLE IF NOT EXISTS corporate_channels (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- whatsapp, teams, meet, zoom, linkedin, etc
    url TEXT NOT NULL,
    department VARCHAR(255),
    icon VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabela achievements (Reconhecimento)
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recipient_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    giver_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

pool.query(queries)
    .then(() => {
        console.log("Banco de dados da Central de Comunicação configurado com sucesso!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("Erro ao configurar banco de dados:", err);
        process.exit(1);
    });
