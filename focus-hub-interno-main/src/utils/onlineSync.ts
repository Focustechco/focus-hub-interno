/**
 * Online Sync Utility for Focus Hub
 * Automatically syncs offline data when connection is restored
 */

import { getSyncQueue, clearSyncQueue, CacheStore } from './offlineCache';
import api from '../../services/api';

interface SyncResult {
    success: number;
    failed: number;
    errors: string[];
}

// API endpoints for each store
const STORE_ENDPOINTS: Record<CacheStore, string> = {
    [CacheStore.TASKS]: '/tasks',
    [CacheStore.GOALS]: '/goals',
    [CacheStore.USERS]: '/users',
    [CacheStore.CHECKINS]: '/checkins',
    [CacheStore.POSTS]: '/posts',
    [CacheStore.SYNC_QUEUE]: '',
};

/**
 * Process a single sync item
 */
async function processSyncItem(item: {
    action: 'create' | 'update' | 'delete';
    store: CacheStore;
    data: any;
}): Promise<boolean> {
    const endpoint = STORE_ENDPOINTS[item.store];
    if (!endpoint) return false;

    try {
        switch (item.action) {
            case 'create':
                await api.post(endpoint, item.data);
                break;
            case 'update':
                await api.put(`${endpoint}/${item.data.id}`, item.data);
                break;
            case 'delete':
                await api.delete(`${endpoint}/${item.data.id}`);
                break;
        }
        return true;
    } catch (error) {
        console.error(`[Sync] Failed to ${item.action} ${item.store}:`, error);
        return false;
    }
}

/**
 * Sync all pending offline changes
 */
export async function syncOfflineChanges(): Promise<SyncResult> {
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    if (!navigator.onLine) {
        console.log('[Sync] Offline, skipping sync');
        return result;
    }

    try {
        const queue = await getSyncQueue();
        console.log(`[Sync] Processing ${queue.length} queued items`);

        for (const item of queue) {
            const success = await processSyncItem(item);
            if (success) {
                result.success++;
            } else {
                result.failed++;
                result.errors.push(`Failed: ${item.action} ${item.store}`);
            }
        }

        // Clear queue after processing
        if (result.failed === 0) {
            await clearSyncQueue();
            console.log('[Sync] Queue cleared successfully');
        }

    } catch (error) {
        console.error('[Sync] Sync failed:', error);
        result.errors.push(String(error));
    }

    return result;
}

/**
 * Setup automatic sync when coming online
 */
export function setupAutoSync(onSync?: (result: SyncResult) => void): () => void {
    const handleOnline = async () => {
        console.log('[Sync] Connection restored, syncing...');
        const result = await syncOfflineChanges();

        if (onSync) {
            onSync(result);
        }

        console.log(`[Sync] Complete: ${result.success} synced, ${result.failed} failed`);
    };

    // Sync when coming online
    window.addEventListener('online', handleOnline);

    // Also try to sync on page load if online
    if (navigator.onLine) {
        setTimeout(handleOnline, 2000); // Delay to let app initialize
    }

    // Return cleanup function
    return () => {
        window.removeEventListener('online', handleOnline);
    };
}

/**
 * Manual sync trigger
 */
export async function triggerManualSync(): Promise<SyncResult> {
    console.log('[Sync] Manual sync triggered');
    return syncOfflineChanges();
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{
    pending: number;
    isOnline: boolean;
}> {
    const queue = await getSyncQueue();
    return {
        pending: queue.length,
        isOnline: navigator.onLine,
    };
}

export default {
    syncOfflineChanges,
    setupAutoSync,
    triggerManualSync,
    getSyncStatus,
};
