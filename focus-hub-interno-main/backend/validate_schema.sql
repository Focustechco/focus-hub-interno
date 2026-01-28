-- Focus Hub Database Validation and Migration Script
-- Run this in Neon to ensure all tables are correctly configured

-- Step 1: Ensure all required tables exist
DO $$
BEGIN
    -- Users table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE TABLE users (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255),
            role VARCHAR(20) DEFAULT 'USER',
            sector VARCHAR(100),
            job_title VARCHAR(150),
            bio TEXT,
            avatar_url TEXT,
            join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_approved BOOLEAN DEFAULT FALSE,
            reset_token TEXT,
            reset_token_expires TIMESTAMP
        );
        RAISE NOTICE 'Created users table';
    END IF;

    -- Tasks table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        CREATE TABLE tasks (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(20) DEFAULT 'pendente',
            priority VARCHAR(20) DEFAULT 'media',
            assignee_id VARCHAR(255) REFERENCES users(id),
            estimated_time INTEGER DEFAULT 60,
            due_date TIMESTAMP,
            depends_on TEXT[],
            goal_id VARCHAR(255),
            subtasks JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created tasks table';
    END IF;

    -- Goals table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goals') THEN
        CREATE TABLE goals (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(50),
            period VARCHAR(50),
            metric VARCHAR(20),
            current_value NUMERIC DEFAULT 0,
            target_value NUMERIC DEFAULT 100,
            sector VARCHAR(100),
            user_id VARCHAR(255) REFERENCES users(id),
            is_monthly_highlight BOOLEAN DEFAULT FALSE,
            status VARCHAR(50) DEFAULT 'em_andamento',
            due_date TIMESTAMP,
            sub_goals JSONB DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created goals table';
    END IF;

    -- Check-ins table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'check_ins') THEN
        CREATE TABLE check_ins (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) REFERENCES users(id),
            check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            check_out_time TIMESTAMP,
            daily_report TEXT,
            location VARCHAR(100),
            mood VARCHAR(50),
            notes TEXT
        );
        RAISE NOTICE 'Created check_ins table';
    END IF;

    -- Posts table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        CREATE TABLE posts (
            id VARCHAR(255) PRIMARY KEY,
            author_id VARCHAR(255) REFERENCES users(id),
            content TEXT NOT NULL,
            is_pinned BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created posts table';
    END IF;

    -- Daily checklist table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_checklist') THEN
        CREATE TABLE daily_checklist (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) REFERENCES users(id),
            text TEXT NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            date DATE NOT NULL
        );
        RAISE NOTICE 'Created daily_checklist table';
    END IF;

    -- Focus links table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'focus_links') THEN
        CREATE TABLE focus_links (
            id VARCHAR(255) PRIMARY KEY,
            title VARCHAR(255),
            label VARCHAR(255),
            description TEXT,
            url TEXT NOT NULL,
            icon VARCHAR(50),
            category VARCHAR(100),
            user_id VARCHAR(255) REFERENCES users(id),
            is_favorite BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created focus_links table';
    END IF;

    -- Access groups table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_groups') THEN
        CREATE TABLE access_groups (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created access_groups table';
    END IF;

    -- Access credentials table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_credentials') THEN
        CREATE TABLE access_credentials (
            id VARCHAR(255) PRIMARY KEY,
            group_id VARCHAR(255) REFERENCES access_groups(id) ON DELETE CASCADE,
            service_name VARCHAR(255) NOT NULL,
            username VARCHAR(255),
            password VARCHAR(255),
            url TEXT,
            notes TEXT,
            is_favorite BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created access_credentials table';
    END IF;

    -- Notifications table
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE notifications (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) REFERENCES users(id),
            type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            link_to VARCHAR(50) DEFAULT 'dashboard',
            is_read BOOLEAN DEFAULT FALSE,
            task_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE 'Created notifications table';
    END IF;
END $$;

-- Step 2: Ensure nullable constraints are correct
ALTER TABLE focus_links ALTER COLUMN title DROP NOT NULL;
ALTER TABLE focus_links ALTER COLUMN label DROP NOT NULL;

-- Step 3: Add missing columns if they don't exist
DO $$
BEGIN
    -- Users: reset_token columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'reset_token') THEN
        ALTER TABLE users ADD COLUMN reset_token TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'reset_token_expires') THEN
        ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_approved') THEN
        ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT TRUE;
    END IF;

    -- Goals: ensure all columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'metric') THEN
        ALTER TABLE goals ADD COLUMN metric VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'status') THEN
        ALTER TABLE goals ADD COLUMN status VARCHAR(50) DEFAULT 'em_andamento';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'goals' AND column_name = 'is_monthly_highlight') THEN
        ALTER TABLE goals ADD COLUMN is_monthly_highlight BOOLEAN DEFAULT FALSE;
    END IF;

    -- Focus links: ensure all columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'focus_links' AND column_name = 'title') THEN
        ALTER TABLE focus_links ADD COLUMN title VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'focus_links' AND column_name = 'user_id') THEN
        ALTER TABLE focus_links ADD COLUMN user_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'focus_links' AND column_name = 'is_favorite') THEN
        ALTER TABLE focus_links ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Step 4: Verify all tables
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
