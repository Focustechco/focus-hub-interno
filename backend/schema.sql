CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255), -- Will be null for now if we just migrate mock users without passwords
  role VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  sector VARCHAR(100),
  job_title VARCHAR(100),
  bio TEXT,
  join_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  priority VARCHAR(50) NOT NULL,
  assignee_id VARCHAR(255) REFERENCES users(id),
  estimated_time INTEGER,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_offline BOOLEAN DEFAULT FALSE,
  goal_id VARCHAR(255) -- Foreign key added later if needed
);

CREATE TABLE IF NOT EXISTS subtasks (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS check_ins (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  check_in_time TIMESTAMP NOT NULL,
  check_out_time TIMESTAMP,
  daily_report TEXT
);

CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR(255) PRIMARY KEY,
  author_id VARCHAR(255) REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_pinned BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS goals (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  period VARCHAR(50),
  metric VARCHAR(50),
  current_value INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  sector VARCHAR(100),
  user_id VARCHAR(255) REFERENCES users(id),
  is_monthly_highlight BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS daily_checklist (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  date DATE NOT NULL
);
