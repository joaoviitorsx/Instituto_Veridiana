/// <reference lib="webworker" />
/* Service worker do PWA.

   - App: cache-first, versionado a cada build (precache do Workbox).
   - API: nunca passa por aqui. O cache de dados é o IndexedDB, explícito
     e com data visível na tela; resposta de API nunca sai do cache do
     service worker.
   - Atualização: só quando a pessoa toca em "atualizar". Nunca recarrega
     sozinho no meio de uma chamada.
   - Background Sync: envia a fila de chamadas quando a rede volta, mesmo
     com o app fechado (Chrome/Android). */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { get } from 'idb-keyval';
import { enviarFila, TAG_SYNC, type Resposta } from './offline/fila';
import { transportar, ErroRede, ErroConfig, MOCK } from './api/transporte';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
/* Qualquer rota do app (/chamada/Ballet, /agenda…) abre o index.html do
   cache: o app inteiro funciona sem rede. */
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

type SyncEvent = ExtendableEvent & { tag: string };
self.addEventListener('sync', ((e: SyncEvent) => {
  if (e.tag !== TAG_SYNC || MOCK) return;
  e.waitUntil(enviarDoServiceWorker());
}) as EventListener);

async function enviarDoServiceWorker() {
  const sessao = await get<string>('sessao');
  if (!sessao) return;
  let deRede = false;
  await enviarFila(
    (d) => transportar('salvarChamada', [sessao, d], 30000) as Promise<Resposta>,
    (e) => {
      if (e instanceof ErroRede || e instanceof ErroConfig) { deRede = true; return 'rede'; }
      return /^\s*(Error:\s*)?SESSAO:/.test(String((e as Error)?.message || '')) ? 'sessao' : 'outro';
    },
  );
  /* Lançar faz o navegador tentar o sync de novo mais tarde. */
  if (deRede) throw new Error('rede');
}
