/* Sem internet: o que a tela mostra quando está usando a cópia guardada. */
import { useSyncExternalStore } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { ehErroRede } from '../api/cliente';
import { dataCurta, hojeISO } from '../util';

export function useOnline(): boolean {
  return useSyncExternalStore(
    (f) => {
      window.addEventListener('online', f);
      window.addEventListener('offline', f);
      return () => { window.removeEventListener('online', f); window.removeEventListener('offline', f); };
    },
    () => navigator.onLine,
  );
}

/* A tela está mostrando o que ficou guardado, e não conseguiu buscar o novo. */
export function usandoCopia(q: UseQueryResult<unknown>, online: boolean): boolean {
  return !!q.data && (!online || q.fetchStatus === 'paused' || (q.isError && ehErroRede(q.error)));
}

/* "Sem internet — lista de 21/10". Discreta, no topo. */
export function FaixaSemInternet({ desde, oQue = 'lista' }: { desde: number; oQue?: string }) {
  const d = new Date(desde);
  const dia = hojeISO(d) === hojeISO() ? 'hoje, ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : dataCurta(hojeISO(d));
  return (
    <div className="mb-4 flex items-center gap-2 rounded-m bg-tinta/90 px-4 py-2.5 text-sm font-medium text-white">
      <WifiOff size={16} className="shrink-0" />
      <span>Sem internet — {oQue} de {dia}</span>
    </div>
  );
}
