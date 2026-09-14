/**
 * Webhook Utility for Focus Hub
 * Supports Slack, Discord, and custom webhook integrations
 */

export type WebhookType = 'slack' | 'discord' | 'custom';

export interface WebhookConfig {
    id: string;
    name: string;
    type: WebhookType;
    url: string;
    enabled: boolean;
    events: WebhookEvent[];
}

export type WebhookEvent =
    | 'task.created'
    | 'task.completed'
    | 'task.overdue'
    | 'goal.completed'
    | 'user.checkin'
    | 'user.checkout'
    | 'post.created';

interface WebhookPayload {
    event: WebhookEvent;
    timestamp: string;
    data: Record<string, any>;
}

/**
 * Format message for Slack webhook
 */
function formatSlackMessage(payload: WebhookPayload): object {
    const eventLabels: Record<WebhookEvent, string> = {
        'task.created': '📋 Nova Tarefa',
        'task.completed': '✅ Tarefa Concluída',
        'task.overdue': '⚠️ Tarefa Atrasada',
        'goal.completed': '🎯 Meta Alcançada',
        'user.checkin': '👋 Check-in',
        'user.checkout': '👋 Check-out',
        'post.created': '📝 Nova Publicação',
    };

    return {
        blocks: [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: eventLabels[payload.event] || payload.event,
                    emoji: true,
                },
            },
            {
                type: 'section',
                fields: Object.entries(payload.data).slice(0, 10).map(([key, value]) => ({
                    type: 'mrkdwn',
                    text: `*${key}:* ${value}`,
                })),
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `Focus Hub • ${new Date(payload.timestamp).toLocaleString('pt-BR')}`,
                    },
                ],
            },
        ],
    };
}

/**
 * Format message for Discord webhook
 */
function formatDiscordMessage(payload: WebhookPayload): object {
    const eventColors: Record<WebhookEvent, number> = {
        'task.created': 0x00ADEF,
        'task.completed': 0x00C49F,
        'task.overdue': 0xFF6B6B,
        'goal.completed': 0xFFD700,
        'user.checkin': 0x9B59B6,
        'user.checkout': 0x9B59B6,
        'post.created': 0xFF6B00,
    };

    const eventLabels: Record<WebhookEvent, string> = {
        'task.created': '📋 Nova Tarefa',
        'task.completed': '✅ Tarefa Concluída',
        'task.overdue': '⚠️ Tarefa Atrasada',
        'goal.completed': '🎯 Meta Alcançada',
        'user.checkin': '👋 Check-in',
        'user.checkout': '👋 Check-out',
        'post.created': '📝 Nova Publicação',
    };

    return {
        embeds: [
            {
                title: eventLabels[payload.event] || payload.event,
                color: eventColors[payload.event] || 0xFF6B00,
                fields: Object.entries(payload.data).slice(0, 10).map(([key, value]) => ({
                    name: key,
                    value: String(value),
                    inline: true,
                })),
                footer: {
                    text: 'Focus Hub',
                },
                timestamp: payload.timestamp,
            },
        ],
    };
}

/**
 * Send webhook notification
 */
export async function sendWebhook(
    config: WebhookConfig,
    event: WebhookEvent,
    data: Record<string, any>
): Promise<boolean> {
    if (!config.enabled || !config.events.includes(event)) {
        return false;
    }

    const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
    };

    let body: object;
    switch (config.type) {
        case 'slack':
            body = formatSlackMessage(payload);
            break;
        case 'discord':
            body = formatDiscordMessage(payload);
            break;
        default:
            body = payload;
    }

    try {
        const response = await fetch(config.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error(`[Webhook] Failed to send to ${config.name}: ${response.status}`);
            return false;
        }

        console.log(`[Webhook] Sent ${event} to ${config.name}`);
        return true;
    } catch (error) {
        console.error(`[Webhook] Error sending to ${config.name}:`, error);
        return false;
    }
}

/**
 * Send to all configured webhooks
 */
export async function broadcastWebhook(
    configs: WebhookConfig[],
    event: WebhookEvent,
    data: Record<string, any>
): Promise<void> {
    const promises = configs
        .filter(c => c.enabled && c.events.includes(event))
        .map(config => sendWebhook(config, event, data));

    await Promise.allSettled(promises);
}

/**
 * Trigger Discord webhook from localStorage config
 * This is the main function to call from app components
 */
export async function triggerDiscordWebhook(
    event: WebhookEvent,
    data: Record<string, any>
): Promise<boolean> {
    const webhookUrl = localStorage.getItem('focushub_discord_webhook');
    const eventsJson = localStorage.getItem('focushub_discord_events');

    if (!webhookUrl) {
        console.log('[Webhook] No Discord webhook configured');
        return false;
    }

    const enabledEvents: string[] = eventsJson ? JSON.parse(eventsJson) : [];
    if (!enabledEvents.includes(event)) {
        console.log(`[Webhook] Event ${event} not enabled`);
        return false;
    }

    const config: WebhookConfig = {
        id: 'discord-local',
        name: 'Discord',
        type: 'discord',
        url: webhookUrl,
        enabled: true,
        events: enabledEvents as WebhookEvent[]
    };

    return sendWebhook(config, event, data);
}

export default { sendWebhook, broadcastWebhook, triggerDiscordWebhook };
