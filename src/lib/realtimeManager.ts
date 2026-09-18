import { supabase } from './supabaseClient';

type TableChangeCallback = (payload?: any) => void;

interface ChannelEntry {
  channel: any;
  listeners: Set<TableChangeCallback>;
  cleanupTimer: any | null;
}

const channelRegistry = new Map<string, ChannelEntry>();

/**
 * Gerenciador Central de Canais Realtime (Singleton Multiplexer).
 * Evita a criação excessiva de canais WebSocket e previne os erros:
 * - ChannelRateLimitReached: Too many channels
 * - IncreaseSubscriptionConnectionPool: Too many database timeouts
 */
export const realtimeManager = {
  subscribe(table: string, callback: TableChangeCallback): () => void {
    if (typeof window === 'undefined' || !table) {
      return () => {};
    }

    const channelKey = `rt_shared_${table.toLowerCase().trim()}`;
    let entry = channelRegistry.get(channelKey);

    if (entry) {
      if (entry.cleanupTimer) {
        clearTimeout(entry.cleanupTimer);
        entry.cleanupTimer = null;
      }
      entry.listeners.add(callback);
    } else {
      const listeners = new Set<TableChangeCallback>();
      listeners.add(callback);

      let channel: any = null;
      try {
        channel = supabase
          .channel(channelKey)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table },
            (payload) => {
              const currentEntry = channelRegistry.get(channelKey);
              if (currentEntry) {
                currentEntry.listeners.forEach((listener) => {
                  try {
                    listener(payload);
                  } catch (err) {
                    console.warn(`[realtimeManager] Erro no listener da tabela ${table}:`, err);
                  }
                });
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn(`[realtimeManager] Erro ao criar canal para ${table}:`, err);
      }

      entry = { channel, listeners, cleanupTimer: null };
      channelRegistry.set(channelKey, entry);
    }

    return () => {
      const currentEntry = channelRegistry.get(channelKey);
      if (!currentEntry) return;

      currentEntry.listeners.delete(callback);

      if (currentEntry.listeners.size === 0) {
        if (currentEntry.cleanupTimer) {
          clearTimeout(currentEntry.cleanupTimer);
        }
        currentEntry.cleanupTimer = setTimeout(() => {
          const finalEntry = channelRegistry.get(channelKey);
          if (finalEntry && finalEntry.listeners.size === 0) {
            try {
              if (finalEntry.channel) {
                supabase.removeChannel(finalEntry.channel);
              }
            } catch {}
            channelRegistry.delete(channelKey);
          }
        }, 5000);
      }
    };
  },
};
