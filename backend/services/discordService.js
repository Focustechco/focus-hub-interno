const { Client, GatewayIntentBits, Partials, WebhookClient } = require('discord.js');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class DiscordService {
    constructor() {
        this.client = null;
        this.serverId = null;
        this.isConnected = false;
        this.webhooks = new Map(); // channelId -> Webhook
    }

    async init() {
        try {
            const res = await pool.query('SELECT bot_token, server_id FROM discord_integration ORDER BY id DESC LIMIT 1');
            if (res.rows.length === 0) {
                console.log('[Discord] No integration configured.');
                return { success: false, message: 'Não configurado' };
            }

            const { bot_token, server_id } = res.rows[0];
            this.serverId = server_id;

            if (this.client) {
                this.client.destroy();
            }

            this.client = new Client({
                intents: [
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.MessageContent,
                    GatewayIntentBits.GuildMembers,
                    GatewayIntentBits.GuildPresences
                ],
                partials: [Partials.Message, Partials.Channel, Partials.Reaction]
            });

            this.client.on('ready', () => {
                console.log(`[Discord] Logged in as ${this.client.user.tag}!`);
                this.isConnected = true;
            });

            this.client.on('messageCreate', (message) => {
                if (message.author.bot) return; // Ignore bot messages for now, or just focus hub bot

                // TODO: Emit to Socket.io so frontend updates in real time
                if (global.io) {
                    global.io.emit('discord_message_create', {
                        id: message.id,
                        content: message.content,
                        channelId: message.channelId,
                        author: {
                            id: message.author.id,
                            username: message.author.username,
                            avatar: message.author.displayAvatarURL()
                        },
                        timestamp: message.createdTimestamp
                    });
                }
            });

            this.client.on('presenceUpdate', (oldPresence, newPresence) => {
                if (global.io && newPresence.userId) {
                    global.io.emit('discord_presence_update', {
                        userId: newPresence.userId,
                        status: newPresence.status // online, dnd, idle, offline
                    });
                }
            });

            await this.client.login(bot_token);
            return { success: true, message: 'Conectado com sucesso' };
        } catch (error) {
            console.error('[Discord] Error initializing:', error);
            this.isConnected = false;
            return { success: false, message: error.message };
        }
    }

    async getStatus() {
        if (!this.isConnected || !this.client) return { connected: false };
        try {
            const guild = await this.client.guilds.fetch(this.serverId);
            return {
                connected: true,
                botName: this.client.user.tag,
                serverName: guild.name,
                memberCount: guild.memberCount
            };
        } catch (e) {
            return { connected: false, error: e.message };
        }
    }

    async getChannels() {
        if (!this.isConnected || !this.client) {
            return [{ id: 'webhook-channel', name: 'Geral', position: 0 }];
        }
        try {
            const guild = await this.client.guilds.fetch(this.serverId);
            const channels = guild.channels.cache.filter(c => c.type === 0);
            
            return channels.map(c => ({
                id: c.id,
                name: c.name,
                parentId: c.parentId,
                position: c.position
            })).sort((a, b) => a.position - b.position);
        } catch (e) {
            return [{ id: 'webhook-channel', name: 'Geral', position: 0 }];
        }
    }

    async getMessages(channelId, limit = 50, before = null) {
        if (!this.isConnected || !this.client) {
            return []; // Retorna lista vazia se não tivermos o bot para ler
        }
        
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || channel.type !== 0) throw new Error('Canal inválido');

            const options = { limit };
            if (before) options.before = before;

            const messages = await channel.messages.fetch(options);
            
            return messages.map(m => ({
                id: m.id,
                content: m.content,
                author: {
                    id: m.author.id,
                    username: m.author.username,
                    avatar: m.author.displayAvatarURL(),
                    isBot: m.author.bot
                },
                timestamp: m.createdTimestamp,
                attachments: m.attachments.map(a => ({
                    id: a.id,
                    url: a.url,
                    name: a.name,
                    contentType: a.contentType
                }))
            })).reverse(); // Oldest first for chat UI
        } catch (err) {
            return [];
        }
    }

    async getOrCreateWebhook(channel) {
        if (this.webhooks.has(channel.id)) {
            return this.webhooks.get(channel.id);
        }
        
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.token);
        
        if (!webhook) {
            webhook = await channel.createWebhook({
                name: 'FocusHub Bridge',
                avatar: 'https://i.imgur.com/AfFp7pu.png',
            });
        }
        
        this.webhooks.set(channel.id, webhook);
        return webhook;
    }

    async sendMessage(channelId, user, content, attachments = []) {
        try {
            // Se tivermos bot e canal, tenta usar a lógica do webhook do canal
            if (this.isConnected && this.client) {
                const channel = await this.client.channels.fetch(channelId);
                const webhook = await this.getOrCreateWebhook(channel);
                return await webhook.send({
                    content: content || undefined,
                    username: user.name,
                    avatarURL: user.avatarUrl || 'https://i.imgur.com/AfFp7pu.png',
                    files: attachments
                });
            }
        } catch (err) {
            console.error('[Discord] Bot webhook send failed:', err.message);
        }

        // Fallback: Usar o webhook fixo fornecido pelo usuário (se o bot não estiver rodando ou falhar)
        const WebhookClient = require('discord.js').WebhookClient;
        const fallbackWebhook = new WebhookClient({ url: 'https://discord.com/api/webhooks/1527141795329212506/pRFQIcpmq8fLeOrVduhdUaojRXu6WNfzCdYuFtdkZFuEL-SydTZ51ZLa2OYVK06KGYvf' });
        
        try {
            const message = await fallbackWebhook.send({
                content: content || undefined,
                username: user.name,
                avatarURL: user.avatarUrl || 'https://i.imgur.com/AfFp7pu.png',
                files: attachments
            });
            return message;
        } catch (err) {
            console.error('[Discord] Fallback webhook send failed:', err);
            throw new Error('Falha ao enviar mensagem pelo webhook');
        }
    }

    async getUsers() {
        if (!this.isConnected || !this.client) {
            return []; // Retorna vazio se o bot não estiver rodando
        }
        
        try {
            const guild = await this.client.guilds.fetch(this.serverId);
            const members = await guild.members.fetch();
            
            return members.map(m => ({
                id: m.user.id,
                username: m.user.username,
                displayName: m.displayName,
                avatar: m.user.displayAvatarURL(),
                status: m.presence ? m.presence.status : 'offline',
                roles: m.roles.cache.map(r => ({ id: r.id, name: r.name }))
            }));
        } catch (e) {
            return [];
        }
    }
}

const discordService = new DiscordService();
module.exports = discordService;
