const { pool } = require('../config/db');

/**
 * WhatsApp Command Handler
 * Processes incoming messages and executes commands
 */
class WhatsAppCommands {
    constructor(whatsAppService) {
        this.whatsAppService = whatsAppService;
        this.commands = {
            '!ajuda': this.helpCommand.bind(this),
            '!help': this.helpCommand.bind(this),
            '!tarefas': this.listTasksCommand.bind(this),
            '!hoje': this.todayTasksCommand.bind(this),
            '!concluir': this.completeTaskCommand.bind(this),
            '!entrada': this.checkInCommand.bind(this),
            '!saida': this.checkOutCommand.bind(this),
            '!status': this.statusCommand.bind(this),
        };
    }

    /**
     * Find user by WhatsApp number
     */
    async findUserByPhone(phone) {
        // Clean phone to digits only
        const cleanPhone = phone.replace(/\D/g, '').replace('@c.us', '');
        console.log(`[WhatsApp] Looking up user by phone: Raw=${phone}, Clean=${cleanPhone}`);

        const result = await pool.query(
            'SELECT id, name, whatsapp FROM users WHERE whatsapp = $1',
            [cleanPhone]
        );

        if (result.rows.length === 0) {
            console.warn(`[WhatsApp] User not found for phone: ${cleanPhone}`);
        } else {
            console.log(`[WhatsApp] User found: ${result.rows[0].name} (${result.rows[0].id})`);
        }

        return result.rows[0] || null;
    }

    /**
     * Process incoming message
     */
    async processMessage(message) {
        const body = message.body.trim();
        const from = message.from;

        // Check if it's a command
        if (!body.startsWith('!')) {
            return null;
        }

        console.log(`[WhatsApp] Processing command: ${body} from ${from}`);

        // Find user
        const user = await this.findUserByPhone(from);
        if (!user) {
            console.warn(`[WhatsApp] Command rejected - User not registered: ${from}`);
            return '❌ Seu número não está cadastrado no sistema. Adicione seu WhatsApp no perfil do Focus Hub.';
        }

        // Parse command and args
        const parts = body.split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        // Execute command
        const handler = this.commands[command];
        if (handler) {
            try {
                console.log(`[WhatsApp] Executing handler for ${command}`);
                return await handler(user, args);
            } catch (error) {
                console.error(`[WhatsApp] Error executing command ${command}:`, error);

                // Return detailed error if possible (for debugging)
                return `❌ Ocorreu um erro ao processar o comando.\nErro: ${error.message}`;
            }
        }

        return `❓ Comando desconhecido: ${command}\n\nDigite *!ajuda* para ver os comandos disponíveis.`;
    }

    /**
     * !ajuda - List available commands
     */
    async helpCommand(user) {
        return `🦊 *Focus Hub - Comandos WhatsApp*

Olá, ${user.name}! Aqui estão os comandos disponíveis:

📋 *!tarefas* - Lista suas tarefas pendentes
📅 *!hoje* - Mostra tarefas com prazo para hoje
✅ *!concluir [ID]* - Marca uma tarefa como concluída
👋 *!entrada* - Registra seu check-in
🚪 *!saida* - Registra seu check-out
📊 *!status* - Resumo do seu dia

Exemplo: _!concluir t123456_`;
    }

    /**
     * !tarefas - List pending tasks
     */
    async listTasksCommand(user) {
        const result = await pool.query(
            `SELECT id, title, priority, due_date 
             FROM tasks 
             WHERE assignee_id = $1 AND status != 'concluida'
             ORDER BY 
                CASE priority 
                    WHEN 'urgente' THEN 1 
                    WHEN 'alta' THEN 2 
                    WHEN 'media' THEN 3 
                    ELSE 4 
                END,
                due_date ASC NULLS LAST
             LIMIT 10`,
            [user.id]
        );

        if (result.rows.length === 0) {
            return '🎉 Parabéns! Você não tem tarefas pendentes.';
        }

        const priorityEmoji = {
            'urgente': '🔴',
            'alta': '🟠',
            'media': '🟡',
            'baixa': '🟢'
        };

        let response = `📋 *Suas Tarefas Pendentes (${result.rows.length})*\n\n`;

        result.rows.forEach((task, i) => {
            const emoji = priorityEmoji[task.priority] || '⚪';
            const dueDate = task.due_date
                ? new Date(task.due_date).toLocaleDateString('pt-BR')
                : 'Sem prazo';
            response += `${emoji} *${task.title}*\n   ID: \`${task.id}\` | Prazo: ${dueDate}\n\n`;
        });

        response += `_Para concluir, digite: !concluir [ID]_`;
        return response;
    }

    /**
     * !hoje - Tasks due today
     */
    async todayTasksCommand(user) {
        const today = new Date().toISOString().split('T')[0];

        const result = await pool.query(
            `SELECT id, title, priority, due_date 
             FROM tasks 
             WHERE assignee_id = $1 
               AND status != 'concluida'
               AND DATE(due_date) = $1
             ORDER BY due_date ASC`,
            [user.id, today]
        );

        if (result.rows.length === 0) {
            return '📅 Nenhuma tarefa com prazo para hoje!';
        }

        let response = `📅 *Tarefas para Hoje (${result.rows.length})*\n\n`;

        result.rows.forEach((task) => {
            const time = task.due_date && task.due_date.includes('T')
                ? task.due_date.split('T')[1].slice(0, 5)
                : '--:--';
            response += `⏰ ${time} - *${task.title}*\n   ID: \`${task.id}\`\n\n`;
        });

        return response;
    }

    /**
     * !concluir [ID] - Mark task as complete
     */
    async completeTaskCommand(user, args) {
        if (args.length === 0) {
            return '❌ Informe o ID da tarefa.\n\nExemplo: _!concluir t123456_';
        }

        const taskId = args[0];

        // Check if task belongs to user
        const checkResult = await pool.query(
            'SELECT id, title FROM tasks WHERE id = $1 AND assignee_id = $2',
            [taskId, user.id]
        );

        if (checkResult.rows.length === 0) {
            return `❌ Tarefa \`${taskId}\` não encontrada ou não pertence a você.`;
        }

        // Update task
        await pool.query(
            "UPDATE tasks SET status = 'concluida' WHERE id = $1",
            [taskId]
        );

        const task = checkResult.rows[0];
        return `✅ Tarefa concluída!\n\n*${task.title}*\n\nBom trabalho! 🚀`;
    }

    /**
     * !entrada - Check-in
     */
    async checkInCommand(user) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Check if already checked in today
        const existingCheckIn = await pool.query(
            `SELECT id FROM check_ins 
             WHERE user_id = $1 AND DATE(check_in_time) = $2`,
            [user.id, today]
        );

        if (existingCheckIn.rows.length > 0) {
            return '⚠️ Você já fez check-in hoje!';
        }

        // Create check-in
        const id = 'ci' + Date.now();
        await pool.query(
            `INSERT INTO check_ins (id, user_id, check_in_time) VALUES ($1, $2, $3)`,
            [id, user.id, now.toISOString()]
        );

        const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `👋 *Check-in registrado!*\n\n⏰ Horário: ${time}\n\nBom trabalho hoje, ${user.name}!`;
    }

    /**
     * !saida - Check-out
     */
    async checkOutCommand(user) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Find today's check-in
        const checkIn = await pool.query(
            `SELECT id, check_in_time FROM check_ins 
             WHERE user_id = $1 AND DATE(check_in_time) = $2
             ORDER BY check_in_time DESC LIMIT 1`,
            [user.id, today]
        );

        if (checkIn.rows.length === 0) {
            return '⚠️ Você não fez check-in hoje. Use *!entrada* primeiro.';
        }

        const checkInRecord = checkIn.rows[0];

        // Update with check-out
        await pool.query(
            `UPDATE check_ins SET check_out_time = $1 WHERE id = $2`,
            [now.toISOString(), checkInRecord.id]
        );

        // Calculate worked hours
        const checkInTime = new Date(checkInRecord.check_in_time);
        const diffMs = now - checkInTime;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `🚪 *Check-out registrado!*\n\n⏰ Saída: ${time}\n⏱️ *Tempo trabalhado:* ${hours}h ${minutes}min\n\nAté amanhã! 👋`;
    }

    /**
     * !status - Daily summary
     */
    async statusCommand(user) {
        const today = new Date().toISOString().split('T')[0];

        // Get check-in
        const checkIn = await pool.query(
            `SELECT check_in_time, check_out_time FROM check_ins 
             WHERE user_id = $1 AND DATE(check_in_time) = $2`,
            [user.id, today]
        );

        // Get tasks
        const tasks = await pool.query(
            `SELECT 
                COUNT(*) FILTER (WHERE status != 'concluida') as pending,
                COUNT(*) FILTER (WHERE status = 'concluida' AND DATE(created_at) = $2) as completed_today
             FROM tasks WHERE assignee_id = $1`,
            [user.id, today]
        );

        const taskData = tasks.rows[0];
        const checkInData = checkIn.rows[0];

        let response = `📊 *Status do Dia - ${user.name}*\n\n`;

        // Check-in status
        if (checkInData) {
            const inTime = new Date(checkInData.check_in_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            response += `✅ Check-in: ${inTime}\n`;
            if (checkInData.check_out_time) {
                const outTime = new Date(checkInData.check_out_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                response += `✅ Check-out: ${outTime}\n`;
            } else {
                response += `⏳ Check-out: Pendente\n`;
            }
        } else {
            response += `❌ Sem check-in hoje\n`;
        }

        response += `\n📋 *Tarefas:*\n`;
        response += `   Pendentes: ${taskData.pending || 0}\n`;
        response += `   Concluídas hoje: ${taskData.completed_today || 0}\n`;

        return response;
    }
}

module.exports = WhatsAppCommands;
