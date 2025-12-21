const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { body, param, validationResult } = require('express-validator');

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

        // Map database fields (snake_case) to frontend expected format (camelCase)
        const mappedTasks = tasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assigneeId: task.assignee_id,
            estimatedTime: task.estimated_time,
            dueDate: task.due_date,
            createdAt: task.created_at,
            isOffline: task.is_offline,
            goalId: task.goal_id,
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
        let { id, title, description, status, priority, assigneeId, estimatedTime, dueDate, subtasks } = req.body;

        // Sanitize dates to ensure empty strings become null for Postgres
        const cleanDate = (d) => (d && typeof d === 'string' && d.trim() !== '') ? d : null;
        dueDate = cleanDate(dueDate);

        if (!id) {
            id = 't' + Date.now();
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO tasks (id, title, description, status, priority, assignee_id, estimated_time, due_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [id, title, description, status, priority, assigneeId, estimatedTime, dueDate || null]
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
                subtasks: subtasks || []
            };

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
    const { title, description, status, priority, assigneeId, estimatedTime, dueDate: rawDueDate, subtasks } = req.body;

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

        // Update main task
        await client.query(
            `UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, assignee_id = $5, estimated_time = $6, due_date = $7
             WHERE id = $8`,
            [title, description, status, priority, cleanAssigneeId, estimatedTime || null, dueDate, id]
        );

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

        await client.query('COMMIT');
        console.log('[PUT /tasks/:id] Task updated successfully:', id);
        res.json({ message: 'Task updated', id });
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

    console.log('[DELETE /tasks/:id] Deleting task:', id);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Delete subtasks first (even though CASCADE should handle it)
        await client.query('DELETE FROM subtasks WHERE task_id = $1', [id]);

        // Delete the task
        const result = await client.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Task not found' });
        }

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

