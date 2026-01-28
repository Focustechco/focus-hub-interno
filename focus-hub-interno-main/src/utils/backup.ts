/**
 * Backup Utility for Focus Hub
 * Frontend data export and backup functionality
 */

import { exportToCSV } from './export';

export interface BackupData {
    version: string;
    createdAt: string;
    data: {
        tasks: any[];
        goals: any[];
        checkIns: any[];
        posts: any[];
        dailyChecklist: any[];
        focusLinks: any[];
    };
}

/**
 * Create a full backup of all data
 */
export function createBackup(data: BackupData['data']): BackupData {
    return {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        data,
    };
}

/**
 * Export backup as JSON file
 */
export function downloadBackupAsJSON(backup: BackupData): void {
    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });

    const date = new Date().toISOString().split('T')[0];
    const filename = `focushub_backup_${date}.json`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

/**
 * Validate backup file structure
 */
export function validateBackup(data: any): data is BackupData {
    if (!data || typeof data !== 'object') return false;
    if (!data.version || !data.createdAt || !data.data) return false;

    const requiredKeys = ['tasks', 'goals', 'checkIns', 'posts'];
    return requiredKeys.every(key => Array.isArray(data.data[key]));
}

/**
 * Parse and validate backup from file
 */
export async function parseBackupFile(file: File): Promise<BackupData | null> {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (validateBackup(data)) {
            return data;
        }

        console.error('[Backup] Invalid backup structure');
        return null;
    } catch (error) {
        console.error('[Backup] Failed to parse backup file:', error);
        return null;
    }
}

/**
 * Get backup summary info
 */
export function getBackupSummary(backup: BackupData): Record<string, number> {
    return {
        tasks: backup.data.tasks?.length || 0,
        goals: backup.data.goals?.length || 0,
        checkIns: backup.data.checkIns?.length || 0,
        posts: backup.data.posts?.length || 0,
        dailyChecklist: backup.data.dailyChecklist?.length || 0,
        focusLinks: backup.data.focusLinks?.length || 0,
    };
}

/**
 * Schedule automatic backup to localStorage
 */
export function scheduleAutoBackup(data: BackupData['data'], intervalMs: number = 3600000): () => void {
    const saveBackup = () => {
        const backup = createBackup(data);
        localStorage.setItem('focushub_autobackup', JSON.stringify(backup));
        localStorage.setItem('focushub_autobackup_date', new Date().toISOString());
        console.log('[Backup] Auto-backup saved to localStorage');
    };

    // Initial save
    saveBackup();

    // Schedule periodic saves
    const intervalId = setInterval(saveBackup, intervalMs);

    // Return cleanup function
    return () => clearInterval(intervalId);
}

/**
 * Get last auto-backup from localStorage
 */
export function getAutoBackup(): BackupData | null {
    try {
        const data = localStorage.getItem('focushub_autobackup');
        if (!data) return null;

        const parsed = JSON.parse(data);
        return validateBackup(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export default {
    createBackup,
    downloadBackupAsJSON,
    validateBackup,
    parseBackupFile,
    getBackupSummary,
    scheduleAutoBackup,
    getAutoBackup,
};
