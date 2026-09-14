const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
    constructor() {
        this.socket = null;
        this.qrCode = null;
        this.status = 'DISCONNECTED';
        this.isReady = false;
        this.commandHandler = null;
        this.lastError = null; // Store initialization errors
        this.authFolder = path.join(__dirname, '..', 'auth_info');

        // Ensure auth folder exists
        if (!fs.existsSync(this.authFolder)) {
            fs.mkdirSync(this.authFolder, { recursive: true });
        }

        this.initialize();
    }

    async initialize() {
        try {
            console.log('[WhatsApp] Initializing Baileys client...');

            const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

            this.socket = makeWASocket({
                auth: state,
                printQRInTerminal: true,
                logger: pino({ level: 'silent' }),
                browser: ['Focus Hub', 'Chrome', '120.0.0']
            });

            // Handle connection updates
            this.socket.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    console.log('[WhatsApp] QR Code received');
                    this.status = 'WAITING_FOR_SCAN';
                    try {
                        this.qrCode = await qrcode.toDataURL(qr);
                    } catch (err) {
                        console.error('[WhatsApp] Error generating QR:', err);
                    }
                }

                if (connection === 'close') {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log('[WhatsApp] Connection closed. Reconnecting:', shouldReconnect);
                    this.status = 'DISCONNECTED';
                    this.isReady = false;

                    if (shouldReconnect) {
                        setTimeout(() => this.initialize(), 5000);
                    }
                } else if (connection === 'open') {
                    console.log('[WhatsApp] Connected successfully!');
                    this.status = 'CONNECTED';
                    this.isReady = true;
                    this.qrCode = null;
                }
            });

            // Save credentials on update
            this.socket.ev.on('creds.update', saveCreds);

            // Handle incoming messages
            this.socket.ev.on('messages.upsert', async ({ messages, type }) => {
                if (type !== 'notify') return;

                for (const msg of messages) {
                    if (!msg.message || msg.key.fromMe) continue;

                    const messageText = msg.message.conversation ||
                        msg.message.extendedTextMessage?.text || '';

                    if (messageText.startsWith('!') && this.commandHandler) {
                        console.log('[WhatsApp] Command received:', messageText);
                        try {
                            const response = await this.commandHandler.processMessage({
                                body: messageText,
                                from: msg.key.remoteJid.replace('@s.whatsapp.net', '')
                            });

                            if (response) {
                                await this.socket.sendMessage(msg.key.remoteJid, { text: response });
                            }
                        } catch (error) {
                            console.error('[WhatsApp] Error processing command:', error);
                            await this.socket.sendMessage(msg.key.remoteJid, {
                                text: '❌ Erro ao processar comando.'
                            });
                        }
                    }
                }
            });

            // Initialize command handler
            const WhatsAppCommands = require('./whatsappCommands');
            this.commandHandler = new WhatsAppCommands(this);

        } catch (error) {
            console.error('[WhatsApp] Initialization error:', error);
            this.status = 'ERROR';
            this.lastError = error.message; // Capture error message
        }
    }

    getQrCode() {
        return {
            qr: this.qrCode,
            status: this.status
        };
    }

    async sendMessage(to, message) {
        if (!this.isReady || !this.socket) {
            console.warn('[WhatsApp] Client not ready');
            return false;
        }

        try {
            // Format number to WhatsApp JID
            let jid = to.replace(/\D/g, '');
            if (!jid.endsWith('@s.whatsapp.net')) {
                jid = `${jid}@s.whatsapp.net`;
            }

            await this.socket.sendMessage(jid, { text: message });
            console.log(`[WhatsApp] Message sent to ${jid}`);
            return true;
        } catch (error) {
            console.error('[WhatsApp] Failed to send message:', error);
            return false;
        }
    }

    async logout() {
        if (this.socket) {
            await this.socket.logout();
            this.status = 'DISCONNECTED';
            this.isReady = false;
            this.qrCode = null;
        }
    }
}

// Singleton instance
const whatsAppService = new WhatsAppService();

module.exports = whatsAppService;
