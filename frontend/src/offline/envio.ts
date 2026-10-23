/* Lado da página da fila: quando enviar, e o que mostrar enquanto isso. */
import { useEffect, useState } from 'react';
import { api, ehErroSessao, invalidarDepoisDe, ErroRede, ErroConfig } from '../api/cliente';
import { MOCK } from '../api/transporte';
import { toast } from '../ui/toast';
import { enviarFila, listarFila, ouvirFila, TAG_SYNC, type ItemFila, type Resposta, type Classifica } from './fila';
import { sessaoAtual } from '../sessao';

export const classificar: Classifica = (e) =>
  e instanceof ErroRede || e instanceof ErroConfig ? 'rede' : ehErroSessao(e) ? 'sessao' : 'outro';

let enviando: Promise<number> | null = null;

/* Itens que a tela da chamada está mandando agora mesmo: o envio
   automático não pega o mesmo item ao mesmo tempo. */
export const emMaos = new Set<string>();

/* Manda o que estiver pendente. Chamar à vontade: duas chamadas ao mesmo
   tempo viram uma. */
export function enviarAgora(): Promise<number> {
  if (!sessaoAtual()) return Promise.resolve(0);
  if (!enviando) {
    enviando = enviarFila(
      (d) => api<Resposta>('salvarChamada', [d], { silencioso: true, prazo: 30000 }),
      classificar,
      emMaos,
    ).then((n) => {
      if (n) invalidarDepoisDe('salvarChamada');
      return n;
    }).finally(() => { enviando = null; });
  }
  return enviando;
}

/* Background Sync: o navegador acorda o service worker quando a rede
   volta, mesmo com o app fechado. Só Chrome/Android; no iPhone valem os
   outros gatilhos. */
export async function pedirSincronizacao() {
  try {
    if (MOCK || !('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sync = (reg as ServiceWorkerRegistration & { sync?: { register(t: string): Promise<void> } }).sync;
    await sync?.register(TAG_SYNC);
  } catch { /* sem suporte: os outros gatilhos cobrem */ }
}

/* Os três gatilhos da página: abrir o app, a rede voltar e o app voltar
   para a frente da tela. Liga uma vez, no main.tsx. */
export function ligarEnvioAutomatico() {
  const tentar = () => { if (navigator.onLine !== false) enviarAgora().catch(() => {}); };
  tentar();
  window.addEventListener('online', tentar);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tentar(); });
  /* Rede que diz estar on-line mas não entrega (4G fraco) não dispara
     'online' de novo. Com coisa pendente, tenta a cada 2 minutos. */
  setInterval(() => {
    listarFila().then((l) => { if (l.some((i) => i.situacao === 'pendente')) tentar(); }).catch(() => {});
  }, 120_000);

  ouvirFila((e) => {
    if (e.tipo === 'enviada') {
      invalidarDepoisDe('salvarChamada');
      toast('Chamada de ' + e.item.turma + ' enviada para a planilha');
    }
  });
}

export function useFila(): ItemFila[] {
  const [itens, setItens] = useState<ItemFila[]>([]);
  useEffect(() => {
    let vivo = true;
    const ler = () => listarFila().then((l) => { if (vivo) setItens(l); }).catch(() => {});
    ler();
    const sair = ouvirFila(ler);
    return () => { vivo = false; sair(); };
  }, []);
  return itens;
}
