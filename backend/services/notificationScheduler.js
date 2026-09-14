const { pool } = require('../config/db');
const cron = require('node-cron');

let whatsAppService = null;

/**
 * Notification Scheduler
 * Handles automated notifications like deadline reminders and daily summaries
 */
class NotificationScheduler {
    constructor(waService) {
        whatsAppService = waService;
        this.jobs = [];
    }

    /**
     * Start all scheduled jobs
     */
    start() {
        console.log('[Scheduler] Starting notification scheduler...');

        // Daily summary at 8:00 AM (Brazil timezone)
        const dailySummaryJob = cron.schedule('0 8 * * *', () => {
            this.sendDailySummaries();
        }, {
            timezone: 'America/Sao_Paulo'
        });
        this.jobs.push(dailySummaryJob);

        // Deadline reminders every hour
        const reminderJob = cron.schedule('0 * * * *', () => {
            this.sendDeadlineReminders();
        }, {
            timezone: 'America/Sao_Paulo'
        });
        this.jobs.push(reminderJob);

        console.log('[Scheduler] Jobs scheduled: Daily Summary (8:00), Deadline Reminders (hourly)');
    }

    /**
     * Stop all scheduled jobs
     */
    stop() {
        this.jobs.forEach(job => job.stop());
        console.log('[Scheduler] All jobs stopped');
    }

    /**
     * Check if current time is within user's DND period
     */
    isInDndPeriod(user) {
        if (!user.whatsapp_dnd_start || !user.whatsapp_dnd_end) {
            return false;
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [startHour, startMin] = user.whatsapp_dnd_start.split(':').map(Number);
        const [endHour, endMin] = user.whatsapp_dnd_end.split(':').map(Number);

        const dndStart = startHour * 60 + startMin;
        const dndEnd = endHour * 60 + endMin;

        // Handle overnight DND (e.g., 22:00 to 07:00)
        if (dndStart > dndEnd) {
            return currentTime >= dndStart || currentTime <= dndEnd;
        }

        return currentTime >= dndStart && currentTime <= dndEnd;
    }

    /**
     * Check user's notification preferences
     */
    canSendNotification(user, type) {
        if (!user.whatsapp) return false;
        if (this.isInDndPeriod(user)) return false;

        const prefs = user.whatsapp_notifications || {};
        return prefs[type] !== false; // Default to true if not set
    }

    /**
     * Send daily summary to all users at 8 AM
     */
    async sendDailySummaries() {
        console.log('[Scheduler] Sending daily summaries...');

        try {
            const users = await pool.query(
                `SELECT id, name, whatsapp, whatsapp_notifications, whatsapp_dnd_start, whatsapp_dnd_end 
                 FROM users WHERE whatsapp IS NOT NULL`
            );

            const today = new Date().toISOString().split('T')[0];

            for (const user of users.rows) {
                if (!this.canSendNotification(user, 'daily_summary')) continue;

                // Get tasks for today
                const tasks = await pool.query(
                    `SELECT id, title, priority, due_date 
                     FROM tasks 
                     WHERE assignee_id = $1 
                       AND status != 'concluida'
                       AND (DATE(due_date) = $2 OR due_date IS NULL)
                     ORDER BY 
                        CASE priority 
                            WHEN 'urgente' THEN 1 
                            WHEN 'alta' THEN 2 
                            WHEN 'media' THEN 3 
                            ELSE 4 
                        END
                     LIMIT 5`,
                    [user.id, today]
                );

                const overdue = await pool.query(
                    `SELECT COUNT(*) as count FROM tasks 
                     WHERE assignee_id = $1 
                       AND status != 'concluida'
                       AND DATE(due_date) < $2`,
                    [user.id, today]
                );

                const overdueCount = parseInt(overdue.rows[0]?.count || 0);

                let message = `☀️ *Bom dia, ${user.name}!*\n\n`;
                message += `📅 *Resumo do Dia - ${new Date().toLocaleDateString('pt-BR')}*\n\n`;

                if (overdueCount > 0) {
                    message += `⚠️ Você tem *${overdueCount}* tarefa(s) atrasada(s)!\n\n`;
                }

                if (tasks.rows.length > 0) {
                    message += `📋 *Suas tarefas de hoje:*\n`;
                    tasks.rows.forEach((task, i) => {
                        const emoji = task.priority === 'urgente' ? '🔴' :
                            task.priority === 'alta' ? '🟠' : '⚪';
                        message += `${emoji} ${task.title}\n`;
                    });
                } else {
                    message += `✨ Nenhuma tarefa programada para hoje!\n`;
                }

                message += `\n_Digite !tarefas para ver todas as pendências_`;

                await whatsAppService.sendMessage(user.whatsapp, message);
                console.log(`[Scheduler] Daily summary sent to ${user.name}`);

                // Small delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 1000));
            }
        } catch (error) {
            console.error('[Scheduler] Error sending daily summaries:', error);
        }
    }

    /**
     * Send deadline reminders (24h and 1h before)
     */
    async sendDeadlineReminders() {
        console.log('[Scheduler] Checking deadline reminders...');

        try {
            const now = new Date();
            const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
            const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Tasks due in ~1 hour (between now and 1h from now)
            const urgent = await pool.query(
                `SELECT t.id, t.title, t.due_date, u.id as user_id, u.name, u.whatsapp, 
                        u.whatsapp_notifications, u.whatsapp_dnd_start, u.whatsapp_dnd_end
                 FROM tasks t
                 JOIN users u ON t.assignee_id = u.id
                 WHERE t.status != 'concluida'
                   AND t.due_date IS NOT NULL
                   AND t.due_date BETWEEN $1 AND $2
                   AND u.whatsapp IS NOT NULL`,
                [now.toISOString(), in1Hour.toISOString()]
            );

            for (const task of urgent.rows) {
                if (!this.canSendNotification(task, 'reminders')) continue;

                // Add In-App notification
                try {
                    const notifId = 'n' + Date.now() + Math.floor(Math.random() * 1000);
                    await pool.query(
                        `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [notifId, task.user_id, 'TASK_DUE_SOON', `Lembrete Urgente: A tarefa ${task.title} vence em 1 hora!`, 'tasks', false, task.id]
                    );
                } catch (e) {
                    console.error('[Scheduler] Error inserting in-app notification:', e);
                }

                const dueTime = new Date(task.due_date).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit'
                });

                const message = `⏰ *Lembrete Urgente!*\n\n` +
                    `A tarefa *${task.title}* vence em menos de 1 hora!\n\n` +
                    `🕐 Prazo: ${dueTime}\n\n` +
                    `_Digite !concluir ${task.id} quando terminar_`;

                await whatsAppService.sendMessage(task.whatsapp, message);
                console.log(`[Scheduler] 1h reminder sent for task ${task.id}`);
            }

            // Tasks due in ~24 hours (between 23h and 25h from now, to catch hourly check)
            const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);
            const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

            const upcoming = await pool.query(
                `SELECT t.id, t.title, t.due_date, u.id as user_id, u.name, u.whatsapp,
                        u.whatsapp_notifications, u.whatsapp_dnd_start, u.whatsapp_dnd_end
                 FROM tasks t
                 JOIN users u ON t.assignee_id = u.id
                 WHERE t.status != 'concluida'
                   AND t.due_date IS NOT NULL
                   AND t.due_date BETWEEN $1 AND $2
                   AND u.whatsapp IS NOT NULL`,
                [in23Hours.toISOString(), in25Hours.toISOString()]
            );

            for (const task of upcoming.rows) {
                if (!this.canSendNotification(task, 'reminders')) continue;

                // Add In-App notification
                try {
                    const notifId = 'n' + Date.now() + Math.floor(Math.random() * 1000);
                    await pool.query(
                        `INSERT INTO notifications (id, user_id, type, message, link_to, is_read, task_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                        [notifId, task.user_id, 'TASK_DUE_SOON', `Lembrete: A tarefa ${task.title} vence amanhã!`, 'tasks', false, task.id]
                    );
                } catch (e) {
                    console.error('[Scheduler] Error inserting in-app notification:', e);
                }

                const dueDate = new Date(task.due_date).toLocaleDateString('pt-BR');
                const dueTime = new Date(task.due_date).toLocaleTimeString('pt-BR', {
                    hour: '2-digit', minute: '2-digit'
                });

                const message = `📅 *Lembrete: Tarefa para amanhã*\n\n` +
                    `*${task.title}*\n\n` +
                    `🕐 Prazo: ${dueDate} às ${dueTime}\n\n` +
                    `_Organize-se para entregar no prazo!_`;

                await whatsAppService.sendMessage(task.whatsapp, message);
                console.log(`[Scheduler] 24h reminder sent for task ${task.id}`);
            }

        } catch (error) {
            console.error('[Scheduler] Error sending deadline reminders:', error);
        }
    }

    /**
     * Send notification about task status change
     */
    async notifyStatusChange(taskId, oldStatus, newStatus, changedBy) {
        try {
            const result = await pool.query(
                `SELECT t.title, u.id as user_id, u.name, u.whatsapp, 
                        u.whatsapp_notifications, u.whatsapp_dnd_start, u.whatsapp_dnd_end,
                        cb.name as changed_by_name
                 FROM tasks t
                 JOIN users u ON t.assignee_id = u.id
                 LEFT JOIN users cb ON cb.id = $2
                 WHERE t.id = $1`,
                [taskId, changedBy]
            );

            if (result.rows.length === 0) return;

            const data = result.rows[0];
            if (!this.canSendNotification(data, 'tasks')) return;
            if (data.user_id === changedBy) return; // Don't notify if user changed their own task

            const statusMap = {
                'pendente': 'Pendente',
                'em_progresso': 'Em Progresso',
                'concluida': 'Concluída'
            };

            const message = `🔄 *Tarefa Atualizada*\n\n` +
                `*${data.title}*\n\n` +
                `Status: ${statusMap[oldStatus] || oldStatus} → *${statusMap[newStatus] || newStatus}*\n` +
                `Por: ${data.changed_by_name || 'Sistema'}`;

            await whatsAppService.sendMessage(data.whatsapp, message);
        } catch (error) {
            console.error('[Scheduler] Error notifying status change:', error);
        }
    }

    /**
     * Send notification about new comment on task
     */
    async notifyNewComment(taskId, commentAuthorId, commentText) {
        try {
            const result = await pool.query(
                `SELECT t.title, u.id as user_id, u.name, u.whatsapp,
                        u.whatsapp_notifications, u.whatsapp_dnd_start, u.whatsapp_dnd_end,
                        ca.name as author_name
                 FROM tasks t
                 JOIN users u ON t.assignee_id = u.id
                 LEFT JOIN users ca ON ca.id = $2
                 WHERE t.id = $1`,
                [taskId, commentAuthorId]
            );

            if (result.rows.length === 0) return;

            const data = result.rows[0];
            if (!this.canSendNotification(data, 'tasks')) return;
            if (data.user_id === commentAuthorId) return; // Don't notify if user commented on their own task

            const preview = commentText.length > 100
                ? commentText.substring(0, 100) + '...'
                : commentText;

            const message = `💬 *Novo Comentário*\n\n` +
                `*${data.title}*\n\n` +
                `${data.author_name || 'Alguém'} comentou:\n` +
                `"${preview}"`;

            await whatsAppService.sendMessage(data.whatsapp, message);
        } catch (error) {
            console.error('[Scheduler] Error notifying new comment:', error);
        }
    }

    /**
     * Send notification about pinned post
     */
    async notifyPinnedPost(postId, authorName, preview) {
        try {
            const users = await pool.query(
                `SELECT id, name, whatsapp, whatsapp_notifications, 
                        whatsapp_dnd_start, whatsapp_dnd_end
                 FROM users WHERE whatsapp IS NOT NULL`
            );

            const message = `📌 *Nova Publicação Fixada*\n\n` +
                `Por: ${authorName}\n\n` +
                `"${preview.substring(0, 150)}${preview.length > 150 ? '...' : ''}"\n\n` +
                `_Acesse o Mural para ver a publicação completa_`;

            for (const user of users.rows) {
                if (!this.canSendNotification(user, 'posts')) continue;

                await whatsAppService.sendMessage(user.whatsapp, message);
                await new Promise(r => setTimeout(r, 500)); // Rate limit
            }
        } catch (error) {
            console.error('[Scheduler] Error notifying pinned post:', error);
        }
    }
}

module.exports = NotificationScheduler;
