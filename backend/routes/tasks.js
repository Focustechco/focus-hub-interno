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

// Allowed values for validation
const VALID_STATUSES = ['pendente', 'em-andamento', 'concluida'];
const VALID_PRIORITIES = ['baixa', 'media', 'alta', 'urgente'];

// GET /api/tasks - Get all tasks
router.get('/', async (req, res) => {
    try {
        const tasksResult = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
        const tasks = tasksResult.rows;

        // Optimize: Fetch all subtasks in one go instead of N+1 queries
        // If there are no tasks, return empty array immediately
        if (tasks.length === 0) {
            return res.json([]);
        }

        const subtasksResult = await pool.query('SELECT * FROM subtasks');
        const allSubtasks = subtasksResult.rows;

        // Map subtasks to their respective tasks
        const tasksWithSubtasks = tasks.map(task => ({
            ...task,
            subtasks: allSubtasks.filter(st => st.task_id === task.id)
        }));

        res.json(tasksWithSubtasks);
    } catch (err) {
        console.error(err);
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

    // Sanitize date
    const cleanDate = (d) => (d && typeof d === 'string' && d.trim() !== '') ? d : null;
    const dueDate = cleanDate(rawDueDate);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update main task
        await client.query(
            `UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, assignee_id = $5, estimated_time = $6, due_date = $7
             WHERE id = $8`,
            [title, description, status, priority, assigneeId, estimatedTime, dueDate || null, id]
        );

        // Update subtasks if provided
        if (subtasks) {
            // Delete existing subtasks
            await client.query('DELETE FROM subtasks WHERE task_id = $1', [id]);

            // Insert new subtasks
            for (const subtask of subtasks) {
                await client.query(
                    `INSERT INTO subtasks (id, task_id, text, completed)
                     VALUES ($1, $2, $3, $4)`,
                    [subtask.id, id, subtask.text, subtask.completed]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Task updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
