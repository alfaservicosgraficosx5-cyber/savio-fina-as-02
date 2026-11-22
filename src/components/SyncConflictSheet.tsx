import React from 'react';
import { AlertTriangle, Cloud, HardDrive, GitMerge } from 'lucide-react';
import { Sheet } from './Sheet';
import type {
  ConflictResolutionStrategy,
  SyncConflictState,
} from '../services/cloudSyncService';

interface SyncConflictSheetProps {
  conflict: SyncConflictState | null;
  busy: boolean;
  onResolve: (strategy: ConflictResolutionStrategy) => void;
  onDismissLater: () => void;
}

export const SyncConflictSheet: React.FC<SyncConflictSheetProps> = ({
  conflict,
  busy,
  onResolve,
  onDismissLater,
}) => {
  return (
    <Sheet
      open={Boolean(conflict)}
      onClose={onDismissLater}
      title="Divergência entre este dispositivo e a nuvem"
      subtitle="Seus dados estão protegidos. Um backup automático será salvo antes de aplicar sua escolha."
      headerVariant="navy"
    >
      {conflict && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <span>
              Encontramos registros locais e registros salvos na nuvem que diferem entre si. Para evitar sobrescrita silenciosa, escolha como consolidar:
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="font-bold text-[#14263d] dark:text-white flex items-center gap-1.5">
                <HardDrive size={14} className="text-emerald-600" /> Este dispositivo (Local)
              </div>
              <div className="text-slate-600 dark:text-slate-300 space-y-0.5">
                <div>Contas: {conflict.localCounts.accounts}</div>
                <div>Lançamentos: {conflict.localCounts.transactions}</div>
                <div>Boletos: {conflict.localCounts.boletos} · Cartões: {conflict.localCounts.creditCards}</div>
                <div>Salários: {conflict.localCounts.salaryRecords ?? 0}</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="font-bold text-[#14263d] dark:text-white flex items-center gap-1.5">
                <Cloud size={14} className="text-blue-600" /> Nuvem (Firestore)
              </div>
              <div className="text-slate-600 dark:text-slate-300 space-y-0.5">
                <div>Contas: {conflict.cloudCounts.accounts}</div>
                <div>Lançamentos: {conflict.cloudCounts.transactions}</div>
                <div>Boletos: {conflict.cloudCounts.boletos} · Cartões: {conflict.cloudCounts.creditCards}</div>
                <div>Salários: {conflict.cloudCounts.salaryRecords ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => onResolve('MERGE_BOTH')}
              className="w-full min-h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <GitMerge size={16} /> Mesclar os dois conjuntos (preserva todos os IDs)
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => onResolve('KEEP_LOCAL')}
              className="w-full min-h-11 px-4 rounded-xl bg-[#14263d] hover:bg-[#1d3552] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <HardDrive size={15} /> Manter dados deste dispositivo e enviar à nuvem
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => onResolve('USE_CLOUD')}
              className="w-full min-h-11 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Cloud size={15} /> Usar dados da nuvem neste dispositivo
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
};
