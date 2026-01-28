/**
 * Offline Data Cache Utility for Focus Hub
 * IndexedDB-based caching for offline support
 */

const DB_NAME = 'focushub-cache';
const DB_VERSION = 1;

// Store names
export enum CacheStore {
    TASKS = 'tasks',
    GOALS = 'goals',
    USERS = 'users',
    CHECKINS = 'checkins',
    POSTS = 'posts',
    SYNC_QUEUE = 'sync_queue',
}

interface SyncQueueItem {
    id: string;
    action: 'create' | 'update' | 'delete';
    store: CacheStore;
    data: any;
    timestamp: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initCache(): Promise<IDBDatabase> {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('[Cache] Failed to open database');
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('[Cache] Database initialized');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            // Create stores
            Object.values(CacheStore).forEach(storeName => {
                if (!database.objectStoreNames.contains(storeName)) {
                    database.createObjectStore(storeName, { keyPath: 'id' });
                }
            });

            console.log('[Cache] Database schema updated');
        };
    });
}

/**
 * Get all items from a store
 */
export async function getCachedData<T>(store: CacheStore): Promise<T[]> {
    const database = await initCache();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(store, 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Save items to a store
 */
export async function setCachedData<T extends { id: string }>(store: CacheStore, data: T[]): Promise<void> {
    const database = await initCache();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);

        // Clear existing data
        objectStore.clear();

        // Add new data
        data.forEach(item => objectStore.add(item));

        transaction.oncomplete = () => {
            console.log(`[Cache] Saved ${data.length} items to ${store}`);
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Add item to sync queue for later synchronization
 */
export async function addToSyncQueue(action: SyncQueueItem['action'], store: CacheStore, data: any): Promise<void> {
    const database = await initCache();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(CacheStore.SYNC_QUEUE, 'readwrite');
        const objectStore = transaction.objectStore(CacheStore.SYNC_QUEUE);

        const item: SyncQueueItem = {
            id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            action,
            store,
            data,
            timestamp: Date.now(),
        };

        objectStore.add(item);

        transaction.oncomplete = () => {
            console.log(`[Cache] Added to sync queue: ${action} ${store}`);
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Get pending sync items
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
    return getCachedData<SyncQueueItem>(CacheStore.SYNC_QUEUE);
}

/**
 * Clear sync queue after successful sync
 */
export async function clearSyncQueue(): Promise<void> {
    const database = await initCache();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction(CacheStore.SYNC_QUEUE, 'readwrite');
        const objectStore = transaction.objectStore(CacheStore.SYNC_QUEUE);

        objectStore.clear();

        transaction.oncomplete = () => {
            console.log('[Cache] Sync queue cleared');
            resolve();
        };
        transaction.onerror = () => reject(transaction.error);
    });
}

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
    const database = await initCache();

    const stores = Object.values(CacheStore);

    for (const store of stores) {
        await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction(store, 'readwrite');
            const objectStore = transaction.objectStore(store);
            objectStore.clear();
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    console.log('[Cache] All cache cleared');
}

/**
 * Get cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
    if (!navigator.storage?.estimate) return 0;

    const { usage = 0 } = await navigator.storage.estimate();
    return usage;
}

export default {
    initCache,
    getCachedData,
    setCachedData,
    addToSyncQueue,
    getSyncQueue,
    clearSyncQueue,
    clearAllCache,
    getCacheSize,
    CacheStore,
};
