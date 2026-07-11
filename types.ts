import React from 'react';

export enum Role {
    ADMIN = 'ADMIN',
    USER = 'USER',
    COLLABORATOR = 'COLLABORATOR',
}

export type Screen = 'dashboard' | 'check-in' | 'tasks' | 'mural' | 'goals' | 'focus-tools' | 'admin' | 'integrations';

export type Sector = 'Administração' | 'Tech' | 'RH' | 'Comercial' | 'Financeiro';

export interface User {
    id: string;
    name: string;
    role: Role;
    email?: string; // Added for auth
    avatarUrl: string;
    sector: Sector;
    jobTitle: string;
    bio: string;
    joinDate: string;
    status?: 'active' | 'archived';
}

export type TaskStatus = 'pendente' | 'em_progresso' | 'concluida';
export type TaskPriority = 'baixa' | 'media' | 'alta';

export interface Subtask {
    id: string;
    text: string;
    completed: boolean;
}

export interface TaskComment {
    id: string;
    taskId: string;
    authorId: string;
    content: string;
    createdAt: string;
}

export interface TaskTag {
    id: string;
    name: string;
    color: string; // hex color
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string;
    estimatedTime: number; // in minutes
    createdAt: string;
    dueDate: string;
    dependsOn?: string[];
    goalId?: string;
    isOffline?: boolean;
    subtasks?: Subtask[];
    comments?: TaskComment[];
    tags?: TaskTag[];
    
    // Novas propriedades para o módulo Agenda
    startTime?: string; // e.g. "14:00"
    endTime?: string;   // e.g. "15:30"
    sector?: Sector;
    location?: string;
    color?: string;     // auto-derived from sector or custom
    repetition?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface CheckIn {
    id: string;
    userId: string;
    checkInTime: string;
    checkOutTime?: string;
    dailyReport?: string;
}

export interface Post {
    id: string;
    authorId: string;
    content: string;
    createdAt: string;
    isPinned?: boolean;
}

export enum NotificationType {
    TASK_ASSIGNED = 'TASK_ASSIGNED',
    TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED',
    NEW_POST = 'NEW_POST',
    TASK_DUE_SOON = 'TASK_DUE_SOON',
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    message: string;
    linkTo: Screen;
    isRead: boolean;
    createdAt: string;
    taskId?: string;
}

export type NotificationPreferences = {
    [key in NotificationType]: boolean;
};

export type GoalType = 'company' | 'sector' | 'team';
export type GoalPeriod = 'monthly' | 'quarterly' | 'annually';

export interface SubGoal {
    id: string;
    text: string;
    completed: boolean;
}

export interface Goal {
    id: string;
    title: string;
    description: string;
    type: GoalType;
    period: GoalPeriod;
    metric: 'BRL' | '%' | 'count';
    current: number;
    target: number;
    isMonthlyHighlight?: boolean;
    sector?: Sector;
    userId?: string;
    subGoals?: SubGoal[];
}

export interface DailyChecklistItem {
    id: string;
    userId: string;
    text: string;
    completed: boolean;
    date: string; // YYYY-MM-DD
}

export interface LinkItem {
    id: string;
    title: string;
    description: string;
    link: string;
    icon: string;
    isFavorite: boolean;
}

export type ContentCategory = 'Curso' | 'Documento' | 'E-book' | 'Treinamento' | 'Material da Focus' | 'Código de Cultura';

export interface ContentItem {
    id: string;
    title: string;
    description: string;
    category: ContentCategory;
    file_url: string;
    cover_image?: string;
    icon: string;
    color: string;
    status: boolean;
    order_index: number;
    created_at?: string;
    updated_at?: string;
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'ia';
}

export interface AccessLink {
    id: string;
    nome: string;
    link: string;
    icon: 'LinkIcon' | 'GlobeIcon';
    descricao: string;
    login?: string;
    senha?: string;
    isFavorite: boolean;
}

export interface AccessGroup {
    id: string;
    name: string;
    links: AccessLink[];
}

export type OfflineAction = {
    type: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK';
    payload: any;
    timestamp: number;
};