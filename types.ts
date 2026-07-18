import React from 'react';

export enum Role {
    ADMIN = 'ADMIN',
    USER = 'USER',
    COLLABORATOR = 'COLLABORATOR',
}

export type Screen = 'dashboard' | 'check-in' | 'tasks' | 'mural' | 'goals' | 'focus-tools' | 'admin' | 'integrations' | 'drive' | 'reports' | 'agenda';

export type Sector = 'Administração' | 'Tech' | 'RH' | 'Comercial' | 'Financeiro';

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime: string;
    size?: string;
    owners?: { displayName: string; photoLink?: string }[];
    starred?: boolean;
    iconLink?: string;
    thumbnailLink?: string;
    webViewLink?: string;
    parents?: string[];
}

export interface DriveFolderPermission {
    id: number;
    folder_id: string;
    folder_name: string;
    sector: string;
    created_by?: string;
}

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
    whatsappNotifications?: any;
    whatsappDndStart?: string;
    whatsappDndEnd?: string;
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
    goalWeight?: number;
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
    
    // Google Calendar
    isGoogleEvent?: boolean;
    googleEventLink?: string;
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

export interface GoalHistory {
    id: string;
    goal_id: string;
    user_id: string;
    action: string;
    details: string;
    created_at: string;
}

export interface Goal {
    id: string;
    title: string;
    description: string;
    sector?: Sector;
    responsible_id?: string;
    team?: string;
    start_date?: string;
    end_date?: string;
    target_value: number;
    current_value: number;
    progress: number;
    metric: 'BRL' | '%' | 'count';
    category: string;
    scope: string;
    priority: string;
    status: string;
    color: string;
    weight: number;
    allow_overflow: boolean;
    observations?: string;
    created_by?: string;
    created_at?: string;
    subgoals?: SubGoal[];
    
    // Legacy fields mapped for compatibility
    current?: number;
    target?: number;
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
    icon: string;
    descricao: string;
    login?: string;
    senha?: string;
    isFavorite: boolean;
}

export interface AccessGroup {
    id: string;
    name: string;
    color?: string;
    links: AccessLink[];
}

export type OfflineAction = {
    type: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK';
    payload: any;
    timestamp: number;
};

// Google Calendar Corporate Integration
export interface GoogleCorporateIntegration {
    id: number;
    google_email: string;
    google_name: string;
    google_avatar_url: string;
    selected_calendars: string[];
    sync_interval_minutes: number;
    allow_user_create_events: boolean;
    last_sync_at: string | null;
    sync_status: 'never' | 'syncing' | 'success' | 'error';
    events_count: number;
    connected_at: string;
}

export interface GoogleCalendarEvent {
    id: string;
    calendar_id: string;
    title: string;
    description: string;
    location: string;
    start_time: string;
    end_time: string;
    all_day: boolean;
    status: string;
    google_meet_link: string | null;
    hangout_link: string | null;
    html_link: string;
    organizer_email: string;
    organizer_name: string;
    attendees: Array<{
        email: string;
        displayName?: string;
        responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction';
        organizer?: boolean;
    }>;
    recurrence: string[] | null;
    color_id: string;
    color_hex: string;
    reminders: any;
}

export interface AgendaDashboard {
    eventsToday: number;
    eventsThisWeek: number;
    nextMeeting: GoogleCalendarEvent | null;
    meetingsToday: number;
    hoursCommitted: number;
    upcomingEvents: GoogleCalendarEvent[];
}