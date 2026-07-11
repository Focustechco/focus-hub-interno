const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { body, param, validationResult } = require('express-validator');
const whatsAppService = require('../services/whatsappService');
const pushService = require('../services/pushService');

// Validation middleware helper
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Allowed values for validation (matching frontend statusConfig)
const VALID_STATUSES = ['pendente', 'em_progresso', 'concluida', 'todo'];
const VALID_PRIORITIES = ['baixa', 'media', 'alta', 'urgente'];

// GET /api/tasks - Get all tasks
router.get('/', async (req, res) => {
    try {
        const tasksResult = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        const tasks = tasksResult.rows;

        // If there are no tasks, return empty array immediately
        if (tasks.length === 0) {
            return res.json([]);
        }

        const subtasksResult = await pool.query('SELECT * FROM subtasks');
        const allSubtasks = subtasksResult.rows;

        // Helper function to format date correctly for frontend
        // With our custom type parsers, PostgreSQL now returns dates as strings
        // Format: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD" 
        // We need to convert to "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
        const formatDueDate = (dateValue) => {
            if (!dateValue) return null;

            // It's a string from PostgreSQL
            if (typeof dateValue === 'string') {
                // Check if it has a time component (space separator from PostgreSQL)
                if (dateValue.includes(' ')) {
                    const [datePart, timePart] = dateValue.split(' ');
                    const timeShort = timePart.slice(0, 5); // Get HH:mm only

                    // If time is 00:00, return date only
                    if (timeShort === '00:00') {
                        return datePart;
                    }
                    return `${datePart}T${timeShort}`;
                }

                // Already has T separator (from our saves) or is date only
                if (dateValue.includes('T')) {
                    return dateValue.slice(0, 16); // YYYY-MM-DDTHH:mm
                }

                // Date only
                return dateValue.slice(0, 10);
            }

            // Fallback for Date objects (shouldn't happen with new config, but just in case)
            if (dateValue instanceof Date) {
                const year = dateValue.getFullYear();
                const month = String(dateValue.getMonth() + 1).padStart(2, '0');
                const day = String(dateValue.getDate()).padStart(2, '0');
                const hours = dateValue.getHours();
                const minutes = dateValue.getMinutes();

                if (hours === 0 && minutes === 0) {
                    return `${year}-${month}-${day}`;
                }
                return `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            }

            return null;
        };

        // Map database fields (snake_case) to frontend expected format (camelCase)
        const mappedTasks = tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assigneeId: task.assignee_id,
            estimatedTime: task.estimated_time,
            dueDate: formatDueDate(task.due_date),
            createdAt: task.created_at,
            isOffline: task.is_offline,
            goalId: task.goal_id,
            startTime: task.start_time,
            endTime: task.end_time,
            sector: task.sector,
            location: task.location,
            color: task.color,
            repetition: task.repetition,
            subtasks: allSubtasks
                .filter(st => st.task_id === task.id)
                .map(st => ({
                    id: st.id,
                    text: st.text,
                    completed: st.completed
                }))
        }));

        res.json(mappedTasks);
    } catch (err) {
        console.error('[GET /tasks] Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/tasks - Create a new task
router.post('/',
    [
        body('title').notEmpty().trim().isLength({ max: 255 }).withMessage('Título é obrigatório (máx. 255 caracteres)'),
        body('status').isIn(VALID_STATUSES).withMessage(`Status inválido. Use: ${VALID_STATUSES.join(', ')}`),
        body('priority').isIn(VALID_PRIORITIES).withMessage(`Prioridade inválida. Use: ${VALID_PRIORITIES.join(', ')}`),
        body('description').optional().trim().isLength({ max: 5000 }),
        body('estimatedTime').optional().isInt({ min: 0, max: 480 }),
    ],
    validate,
    async (req, res) => {
        let { id, title, description, status, priority, assigneeId, estimatedTime, dueDate, subtasks, startTime, endTime, sector, location, color, repetition } = req.body;

        // Sanitize dates to ensure empty strings become null for Postgres
        const cleanDate = (d) => (d && typeof d === 'string' && d.trim() !== '') ? d : null;
        dueDate = cleanDate(dueDate);

        if (!id) {
            id = 't' + Date.now();
        }

        // Handle case where assigneeId might be empty string
        const cleanAssigneeId = assigneeId && assigneeId.trim() !== '' ? assigneeId : null;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO tasks (id, title, description, status, priority, assignee_id, estimated_time, due_date, start_time, end_time, sector, location, color, repetition)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [id, title, description, status, priority, cleanAssigneeId, estimatedTime, dueDate || null, startTime || null, endTime || null, sector || null, location || null, color || null, repetition || 'none']
            );

            if (subtasks && subtasks.length > 0) {
                for (const subtask of subtasks) {
                    await client.query(
                        `INSERT INTO subtasks (id, task_id, text, completed)
                     VALUES ($1, $2, $3, $4)`,
                        [subtask.id, id, subtask.text, subtask.completed]
                    );
                }
            }

            await client.query('COMMIT');

            const newTask = {
                id,
                title,
                description,
                status,
                priority,
                assigneeId,
                estimatedTime,
                dueDate,
                startTime,
                endTime,
                sector,
                location,
                color,
                repetition,
                subtasks: subtasks || []
            };

            // Create DB Notification and WhatsApp Notification if assigned
            if (assigneeId) {
                try {
                    const notifId = 'n' + Date.now() + Math.floor(Math.random() * 1000);
                    await client.query(
                        `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [notifId, assigneeId, 'TASK_ASSIGNED', `Você foi atribuído à tarefa: ${title}`, 'tasks', false, id]
                    );
                    pushService.sendPushToUser(assigneeId, {
                        title: '📋 Nova Tarefa Atribuída',
                        body: `Você foi atribuído à tarefa: ${title}`,
                        url: '/',
                        tag: `notification-TASK_ASSIGNED-${notifId}`,
                    }).catch(err => console.warn('Push failed:', err.message));
                } catch (err) {
                    console.error('Failed to create DB notification:', err);
                }

                try {
                    const userRes = await pool.query('SELECT whatsapp, name FROM users WHERE id = $1', [assigneeId]);
                    if (userRes.rows.length > 0) {
                        const user = userRes.rows[0];
                        if (user.whatsapp) {
                            const message = `📋 *Nova Tarefa Atribuída*\n\n*Título:* ${title}\n*Prioridade:* ${priority}\n*Prazo:* ${dueDate ? new Date(dueDate).toLocaleDateString('pt-BR') : 'Sem prazo'}\n\nAcesse o Focus Hub para ver detalhes.`;
                            whatsAppService.sendMessage(user.whatsapp, message).catch(console.error);
                        }
                    }
                } catch (error) {
                    console.error('Failed to send WhatsApp notification:', error);
                }
            }

            res.status(201).json(newTask);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ message: 'Server error' });
        } finally {
            client.release();
        }
    });

// PUT /api/tasks/:id - Update a task
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority, assigneeId, estimatedTime, dueDate: rawDueDate, subtasks, startTime, endTime, sector, location, color, repetition } = req.body;

    console.log('[PUT /tasks/:id] Updating task:', id);
    console.log('[PUT /tasks/:id] Body:', JSON.stringify(req.body, null, 2));

    // Sanitize date
    const cleanDate = (d) => (d && typeof d === 'string' && d.trim() !== '') ? d : null;
    const dueDate = cleanDate(rawDueDate);

    // Handle case where assigneeId might be empty string
    const cleanAssigneeId = assigneeId && assigneeId.trim() !== '' ? assigneeId : null;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get previous task state to check for changes
        const prevTaskRes = await client.query('SELECT assignee_id, status FROM tasks WHERE id = $1', [id]);
        const prevTask = prevTaskRes.rows.length > 0 ? prevTaskRes.rows[0] : null;

        // Update main task
        const updateResult = await client.query(
            `UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, assignee_id = $5, estimated_time = $6, due_date = $7, start_time = $8, end_time = $9, sector = $10, location = $11, color = $12, repetition = $13
             WHERE id = $14
             RETURNING *`,
            [title, description, status, priority, cleanAssigneeId, estimatedTime ?? null, dueDate, startTime || null, endTime || null, sector || null, location || null, color || null, repetition || 'none', id]
        );

        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Task not found' });
        }

        const updatedTaskRow = updateResult.rows[0];

        // Update subtasks if provided
        if (subtasks && Array.isArray(subtasks)) {
            // Delete existing subtasks
            await client.query('DELETE FROM subtasks WHERE task_id = $1', [id]);

            // Insert new subtasks
            for (const subtask of subtasks) {
                if (subtask && subtask.id && subtask.text) {
                    await client.query(
                        `INSERT INTO subtasks (id, task_id, text, completed)
                         VALUES ($1, $2, $3, $4)`,
                        [subtask.id, id, subtask.text, subtask.completed || false]
                    );
                }
            }
        }

        const subtasksResult = await client.query(
            'SELECT id, text, completed FROM subtasks WHERE task_id = $1',
            [id]
        );

        const formatDueDate = (dateValue) => {
            if (!dateValue) return null;

            if (typeof dateValue === 'string') {
                if (dateValue.includes(' ')) {
                    const [datePart, timePart] = dateValue.split(' ');
                    const timeShort = (timePart || '').slice(0, 5);
                    if (timeShort === '00:00') return datePart;
                    return `${datePart}T${timeShort}`;
                }
                if (dateValue.includes('T')) {
                    return dateValue.slice(0, 16);
                }
                return dateValue.slice(0, 10);
            }

            if (dateValue instanceof Date) {
                const year = dateValue.getFullYear();
                const month = String(dateValue.getMonth() + 1).padStart(2, '0');
                const day = String(dateValue.getDate()).padStart(2, '0');
                const hours = dateValue.getHours();
                const minutes = dateValue.getMinutes();
                if (hours === 0 && minutes === 0) return `${year}-${month}-${day}`;
                return `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            }

            return null;
        };

        const updatedTask = {
            id: updatedTaskRow.id,
            title: updatedTaskRow.title,
            description: updatedTaskRow.description,
            status: updatedTaskRow.status,
            priority: updatedTaskRow.priority,
            assigneeId: updatedTaskRow.assignee_id,
            estimatedTime: updatedTaskRow.estimated_time,
            dueDate: formatDueDate(updatedTaskRow.due_date),
            createdAt: updatedTaskRow.created_at,
            isOffline: updatedTaskRow.is_offline,
            goalId: updatedTaskRow.goal_id,
            startTime: updatedTaskRow.start_time,
            endTime: updatedTaskRow.end_time,
            sector: updatedTaskRow.sector,
            location: updatedTaskRow.location,
            color: updatedTaskRow.color,
            repetition: updatedTaskRow.repetition,
            subtasks: subtasksResult.rows.map(st => ({
                id: st.id,
                text: st.text,
                completed: st.completed
            }))
        };

        await client.query('COMMIT');
        console.log('[PUT /tasks/:id] Task updated successfully:', id);
        res.json({ message: 'Task updated', task: updatedTask });

        // Handle Notifications
        if (cleanAssigneeId && prevTask) {
            try {
                // If newly assigned to this user
                if (prevTask.assignee_id !== cleanAssigneeId) {
                    const notifId = 'n' + Date.now() + Math.floor(Math.random() * 1000);
                    await client.query(
                        `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [notifId, cleanAssigneeId, 'TASK_ASSIGNED', `Você foi atribuído à tarefa: ${title}`, 'tasks', false, id]
                    );
                    pushService.sendPushToUser(cleanAssigneeId, {
                        title: '📋 Nova Tarefa Atribuída',
                        body: `Você foi atribuído à tarefa: ${title}`,
                        url: '/',
                        tag: `notification-TASK_ASSIGNED-${notifId}`,
                    }).catch(err => console.warn('Push failed:', err.message));
                    
                    const userRes = await client.query('SELECT whatsapp, name FROM users WHERE id = $1', [cleanAssigneeId]);
                    if (userRes.rows.length > 0 && userRes.rows[0].whatsapp) {
                        const message = `📋 *Nova Tarefa Atribuída*\n\n*Título:* ${title}\n*Prazo:* ${dueDate ? new Date(dueDate).toLocaleDateString('pt-BR') : 'Sem prazo'}\n\nAcesse o Focus Hub para ver detalhes.`;
                        whatsAppService.sendMessage(userRes.rows[0].whatsapp, message).catch(console.error);
                    }
                } 
                // If status changed to completed
                else if (status === 'concluida' && prevTask.status !== 'concluida') {
                    const notifId = 'n' + Date.now() + Math.floor(Math.random() * 1000);
                    await client.query(
                        `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [notifId, cleanAssigneeId, 'TASK_STATUS_CHANGED', `A tarefa "${title}" foi marcada como concluída!`, 'tasks', false, id]
                    );
                    pushService.sendPushToUser(cleanAssigneeId, {
                        title: '✅ Tarefa Concluída',
                        body: `A tarefa "${title}" foi marcada como concluída!`,
                        url: '/',
                        tag: `notification-TASK_STATUS_CHANGED-${notifId}`,
                    }).catch(err => console.warn('Push failed:', err.message));

                    const userRes = await client.query('SELECT whatsapp, name FROM users WHERE id = $1', [cleanAssigneeId]);
                    if (userRes.rows.length > 0 && userRes.rows[0].whatsapp) {
                        const message = `✅ *Tarefa Concluída*\n\n*Título:* ${title}\n\nBom trabalho! 🚀`;
                        whatsAppService.sendMessage(userRes.rows[0].whatsapp, message).catch(console.error);
                    }
                }
                // If priority became urgent
                else if (priority === 'urgente' && prevTask.priority !== 'urgente') {
                    const notifId = 'n' + Date.now() + Math.floor(Math.random() * 1000);
                    await client.query(
                        `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [notifId, cleanAssigneeId, 'TASK_STATUS_CHANGED', `A tarefa "${title}" foi marcada como URGENTE!`, 'tasks', false, id]
                    );
                    pushService.sendPushToUser(cleanAssigneeId, {
                        title: '🔥 Tarefa Urgente',
                        body: `A tarefa "${title}" foi marcada como URGENTE!`,
                        url: '/',
                        tag: `notification-TASK_STATUS_CHANGED-${notifId}`,
                    }).catch(err => console.warn('Push failed:', err.message));

                    const userRes = await client.query('SELECT whatsapp, name FROM users WHERE id = $1', [cleanAssigneeId]);
                    if (userRes.rows.length > 0 && userRes.rows[0].whatsapp) {
                        const message = `🔥 *Tarefa Urgente*\n\n*Título:* ${title}\n*Prazo:* ${dueDate ? new Date(dueDate).toLocaleDateString('pt-BR') : 'Sem prazo'}\n\nAtenção para esta tarefa!`;
                        whatsAppService.sendMessage(userRes.rows[0].whatsapp, message).catch(console.error);
                    }
                }
            } catch (error) {
                console.error('Failed to handle notifications on update:', error);
            }
        }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[PUT /tasks/:id] Error updating task:', err.message);
        console.error('[PUT /tasks/:id] Stack:', err.stack);
        res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
        client.release();
    }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const user = req.user; // Populated by authMiddleware

    console.log('[DELETE /tasks/:id] Deleting task:', id, 'by user:', user.id);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check task existence and ownership
        const taskCheck = await client.query('SELECT assignee_id FROM tasks WHERE id = $1', [id]);

        if (taskCheck.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Task not found' });
        }

        const task = taskCheck.rows[0];

        // Permission check: Admin or Assignee only
        if (user.role !== 'ADMIN' && user.id !== task.assignee_id) {
            await client.query('ROLLBACK');
            console.warn(`[DELETE /tasks/:id] Unauthorized deletion attempt by ${user.id} on task ${id}`);
            return res.status(403).json({ message: 'Você não tem permissão para excluir esta tarefa.' });
        }

        // Delete subtasks first (even though CASCADE should handle it)
        await client.query('DELETE FROM subtasks WHERE task_id = $1', [id]);

        // Delete the task
        await client.query('DELETE FROM tasks WHERE id = $1', [id]);

        await client.query('COMMIT');
        console.log('[DELETE /tasks/:id] Task deleted successfully:', id);
        res.json({ message: 'Task deleted', id });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[DELETE /tasks/:id] Error deleting task:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;

