-- Focus Hub - CLEAN Database Reset Script
-- Execute this ENTIRE script in Neon SQL Editor

-- Step 1: Drop ALL existing tables
DROP TABLE IF EXISTS daily_checklist CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS focus_links CASCADE;
DROP TABLE IF EXISTS access_groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Create Users table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'colaborador',
  avatar_url TEXT,
  sector VARCHAR(100),
  job_title VARCHAR(100),
  bio TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create Tasks table
CREATE TABLE tasks (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  assignee_id VARCHAR(255) REFERENCES users(id),
  estimated_time INTEGER,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_offline BOOLEAN DEFAULT FALSE,
  goal_id VARCHAR(255)
);

-- Step 4: Create Subtasks table
CREATE TABLE subtasks (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE
);

-- Step 5: Create Check-ins table
CREATE TABLE check_ins (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  type VARCHAR(50) DEFAULT 'check-in',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  check_out_time TIMESTAMP,
  location TEXT,
  mood VARCHAR(50),
  notes TEXT,
  daily_report TEXT
);

-- Step 6: Create Posts table
CREATE TABLE posts (
  id VARCHAR(255) PRIMARY KEY,
  author_id VARCHAR(255) REFERENCES users(id),
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  likes INTEGER DEFAULT 0,
  comments JSONB DEFAULT '[]',
  is_pinned BOOLEAN DEFAULT FALSE
);

-- Step 7: Create Goals table
CREATE TABLE goals (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'individual',
  period VARCHAR(50),
  metric VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL DEFAULT 100,
  sector VARCHAR(100),
  user_id VARCHAR(255) REFERENCES users(id),
  due_date DATE,
  is_monthly_highlight BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 8: Create Daily Checklist table
CREATE TABLE daily_checklist (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  date DATE NOT NULL
);

-- Step 9: Create Focus Links table
CREATE TABLE focus_links (
  id VARCHAR(255) PRIMARY KEY,
  url TEXT NOT NULL,
  label VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 10: Create Access Groups table
CREATE TABLE access_groups (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 11: Create Access Credentials table (credentials within groups)
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

-- Done! All tables created successfully.
