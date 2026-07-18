const { pool } = require('./backend/config/db');
pool.query(`
    SELECT 
        u.id, u.name, u.email, u.whatsapp, u.role, u.avatar_url, u.sector, 
        u.job_title, u.bio, u.join_date, u.status, u.is_approved, u.created_at,
        (SELECT COUNT(*) FROM tasks WHERE assignee_id = u.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE assignee_id = u.id AND status = 'concluida') as completed_tasks,
        (SELECT COUNT(*) FROM goals WHERE user_id = u.id) as goal_count,
        (SELECT COUNT(*) FROM posts WHERE author_id = u.id) as post_count,
        (SELECT MAX(timestamp) FROM check_ins WHERE user_id = u.id) as last_checkin
    FROM users u
    ORDER BY u.name ASC
`).then(res => {
    console.log('Success, rows:', res.rows.length);
}).catch(e => {
    console.error('Error:', e.message);
}).finally(() => {
    process.exit(0);
});
