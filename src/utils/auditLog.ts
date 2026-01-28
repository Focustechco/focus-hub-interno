/**
 * Audit Log Utility for Focus Hub
 * Tracks user actions for compliance and debugging
 */

export enum AuditAction {
    // Auth
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    REGISTER = 'REGISTER',

    // Tasks
    TASK_CREATE = 'TASK_CREATE',
    TASK_UPDATE = 'TASK_UPDATE',
    TASK_DELETE = 'TASK_DELETE',
    TASK_STATUS_CHANGE = 'TASK_STATUS_CHANGE',

    // Goals
    GOAL_CREATE = 'GOAL_CREATE',
    GOAL_UPDATE = 'GOAL_UPDATE',
    GOAL_DELETE = 'GOAL_DELETE',

    // Users
    USER_CREATE = 'USER_CREATE',
    USER_UPDATE = 'USER_UPDATE',
    USER_DELETE = 'USER_DELETE',
    USER_APPROVE = 'USER_APPROVE',
    USER_REJECT = 'USER_REJECT',

    // Check-ins
    CHECKIN = 'CHECKIN',
    CHECKOUT = 'CHECKOUT',

    // Posts
    POST_CREATE = 'POST_CREATE',
    POST_DELETE = 'POST_DELETE',

    // Settings
    SETTINGS_UPDATE = 'SETTINGS_UPDATE',
}

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    userId: string;
    userName?: string;
    action: AuditAction;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

// In-memory log storage (would be database in production)
const auditLogs: AuditLogEntry[] = [];

/**
 * Log an action to the audit trail
 */
export function logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const fullEntry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...entry,
    };

    auditLogs.unshift(fullEntry);

    // Keep only last 1000 entries in memory
    if (auditLogs.length > 1000) {
        auditLogs.pop();
    }

    // In production, this would send to backend
    console.log('[AUDIT]', fullEntry.action, fullEntry.resourceType, fullEntry.resourceId);
}

/**
 * Get recent audit logs
 */
export function getAuditLogs(limit: number = 100): AuditLogEntry[] {
    return auditLogs.slice(0, limit);
}

/**
 * Get audit logs for a specific user
 */
export function getAuditLogsForUser(userId: string, limit: number = 50): AuditLogEntry[] {
    return auditLogs.filter(log => log.userId === userId).slice(0, limit);
}

/**
 * Get audit logs for a specific resource
 */
export function getAuditLogsForResource(resourceType: string, resourceId: string): AuditLogEntry[] {
    return auditLogs.filter(log =>
        log.resourceType === resourceType && log.resourceId === resourceId
    );
}

/**
 * Format action for display
 */
export function formatAuditAction(action: AuditAction): string {
    const actionLabels: Record<AuditAction, string> = {
        [AuditAction.LOGIN]: 'Fez login',
        [AuditAction.LOGOUT]: 'Fez logout',
        [AuditAction.REGISTER]: 'Se registrou',
        [AuditAction.TASK_CREATE]: 'Criou tarefa',
        [AuditAction.TASK_UPDATE]: 'Atualizou tarefa',
        [AuditAction.TASK_DELETE]: 'Excluiu tarefa',
        [AuditAction.TASK_STATUS_CHANGE]: 'Alterou status da tarefa',
        [AuditAction.GOAL_CREATE]: 'Criou meta',
        [AuditAction.GOAL_UPDATE]: 'Atualizou meta',
        [AuditAction.GOAL_DELETE]: 'Excluiu meta',
        [AuditAction.USER_CREATE]: 'Criou usuário',
        [AuditAction.USER_UPDATE]: 'Atualizou usuário',
        [AuditAction.USER_DELETE]: 'Excluiu usuário',
        [AuditAction.USER_APPROVE]: 'Aprovou usuário',
        [AuditAction.USER_REJECT]: 'Rejeitou usuário',
        [AuditAction.CHECKIN]: 'Registrou entrada',
        [AuditAction.CHECKOUT]: 'Registrou saída',
        [AuditAction.POST_CREATE]: 'Publicou no mural',
        [AuditAction.POST_DELETE]: 'Excluiu do mural',
        [AuditAction.SETTINGS_UPDATE]: 'Atualizou configurações',
    };
    return actionLabels[action] || action;
}

export default { logAudit, getAuditLogs, getAuditLogsForUser, formatAuditAction };
