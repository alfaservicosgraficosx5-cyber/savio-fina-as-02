import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { flushOfflineQueue, loadOfflineQueue } from '../core/sync/offlineQueue';
import { fetchCdiWithCache } from '../services/cdiService';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [justReconnected, setJustReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [queuedCount, setQueuedCount] = useState(() => loadOfflineQueue().length);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);

  useEffect(() => {
    const refreshCount = () => setQueuedCount(loadOfflineQueue().length);
    window.addEventListener('finance-ia-offline-queue-changed', refreshCount);
    return () => window.removeEventListener('finance-ia-offline-queue-changed', refreshCount);
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setJustReconnected(false);
      return;
    }

    if (loadOfflineQueue().length > 0) {
      void flushOfflineQueue(async (item) => {
        if (item.kind === 'CDI_REFRESH') {
          const end = new Date();
          const start = new Date();
          start.setFullYear(end.getFullYear() - 1);
          await fetchCdiWithCache(start, end, { forceRefresh: true });
          return true;
        }
        return false;
      }).then((res) => {
        setQueuedCount(res.remaining);
        if (res.succeeded > 0) {
          setSyncResultMsg(`${res.succeeded} pendência(s) sincronizada(s) após reconexão.`);
          setTimeout(() => setSyncResultMsg(null), 4000);
        }
      });
    }

    if (wasOffline) {
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !justReconnected && !syncResultMsg) return null;

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-4 left-4 right-4 md:right-auto z-40 flex items-center gap-2.5 rounded-xl bg-amber-600 text-white px-3.5 py-2.5 text-xs font-bold shadow-lg"
      >
        <WifiOff size={16} className="shrink-0" />
        <span>
          Modo Offline — Lançamentos locais salvos no dispositivo.
          {queuedCount > 0 ? ` (${queuedCount} na fila de sincronização)` : ''}
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-3.5 py-2 text-xs font-bold shadow-lg"
    >
      {syncResultMsg ? <RefreshCw size={15} className="shrink-0" /> : <Wifi size={15} className="shrink-0" />}
      <span>{syncResultMsg || 'Conexão restabelecida.'}</span>
    </div>
  );
};
