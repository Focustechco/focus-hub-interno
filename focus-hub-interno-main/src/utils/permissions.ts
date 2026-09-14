/**
 * Granular Permissions System for Focus Hub
 * Role-based access control with fine-grained permissions
 */

import { Role } from '../types';

// Permission types
export enum Permission {
    // Task permissions
    TASK_VIEW = 'task.view',
    TASK_CREATE = 'task.create',
    TASK_EDIT = 'task.edit',
    TASK_EDIT_OWN = 'task.edit.own',
    TASK_DELETE = 'task.delete',
    TASK_DELETE_OWN = 'task.delete.own',
    TASK_ASSIGN = 'task.assign',

    // Goal permissions
    GOAL_VIEW = 'goal.view',
    GOAL_CREATE = 'goal.create',
    GOAL_EDIT = 'goal.edit',
    GOAL_DELETE = 'goal.delete',

    // User permissions
    USER_VIEW = 'user.view',
    USER_CREATE = 'user.create',
    USER_EDIT = 'user.edit',
    USER_DELETE = 'user.delete',
    USER_APPROVE = 'user.approve',

    // Post permissions
    POST_VIEW = 'post.view',
    POST_CREATE = 'post.create',
    POST_EDIT_OWN = 'post.edit.own',
    POST_DELETE = 'post.delete',
    POST_DELETE_OWN = 'post.delete.own',
    POST_PIN = 'post.pin',

    // Admin permissions
    ADMIN_VIEW_LOGS = 'admin.viewLogs',
    ADMIN_VIEW_METRICS = 'admin.viewMetrics',
    ADMIN_MANAGE_SETTINGS = 'admin.manageSettings',
    ADMIN_MANAGE_WEBHOOKS = 'admin.manageWebhooks',

    // Tools permissions
    TOOLS_VIEW = 'tools.view',
    TOOLS_MANAGE = 'tools.manage',
}

// Role permission mappings
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    [Role.ADMIN]: Object.values(Permission), // Admin has all permissions

    [Role.USER]: [
        Permission.TASK_VIEW,
        Permission.TASK_CREATE,
        Permission.TASK_EDIT_OWN,
        Permission.TASK_DELETE_OWN,
        Permission.GOAL_VIEW,
        Permission.GOAL_CREATE,
        Permission.GOAL_EDIT,
        Permission.USER_VIEW,
        Permission.POST_VIEW,
        Permission.POST_CREATE,
        Permission.POST_EDIT_OWN,
        Permission.POST_DELETE_OWN,
        Permission.TOOLS_VIEW,
        Permission.TOOLS_MANAGE,
    ],

    [Role.COLLABORATOR]: [
        Permission.TASK_VIEW,
        Permission.TASK_EDIT_OWN,
        Permission.GOAL_VIEW,
        Permission.USER_VIEW,
        Permission.POST_VIEW,
        Permission.POST_CREATE,
        Permission.POST_EDIT_OWN,
        Permission.TOOLS_VIEW,
    ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
    return permissions.some(p => hasPermission(role, p));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
    return permissions.every(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user can edit a resource
 */
export function canEdit(role: Role, resourceOwnerId: string, currentUserId: string, editPermission: Permission, editOwnPermission: Permission): boolean {
    if (hasPermission(role, editPermission)) return true;
    if (hasPermission(role, editOwnPermission) && resourceOwnerId === currentUserId) return true;
    return false;
}

/**
 * Check if user can delete a resource
 */
export function canDelete(role: Role, resourceOwnerId: string, currentUserId: string, deletePermission: Permission, deleteOwnPermission: Permission): boolean {
    if (hasPermission(role, deletePermission)) return true;
    if (hasPermission(role, deleteOwnPermission) && resourceOwnerId === currentUserId) return true;
    return false;
}

/**
 * React hook-like function to use in components
 */
export function createPermissionChecker(role: Role, userId: string) {
    return {
        can: (permission: Permission) => hasPermission(role, permission),
        canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
        canAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),
        canEditResource: (ownerId: string, editPerm: Permission, editOwnPerm: Permission) =>
            canEdit(role, ownerId, userId, editPerm, editOwnPerm),
        canDeleteResource: (ownerId: string, deletePerm: Permission, deleteOwnPerm: Permission) =>
            canDelete(role, ownerId, userId, deletePerm, deleteOwnPerm),
    };
}

export default {
    Permission,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getRolePermissions,
    canEdit,
    canDelete,
    createPermissionChecker,
};
