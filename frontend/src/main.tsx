import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { routeTree } from './routeTree.gen';
import { queryClient, persister, PERSISTIDAS, GUARDA_MS } from './api/cliente';
import { quandoSessaoCair } from './sessao';
import { ligarEnvioAutomatico } from './offline/envio';
import { ouvirInstalacao } from './offline/instalar';
import { fecharToast } from './ui/toast';
import { folha } from './ui/folha';
import { ehRaiz } from './ui/Abas';
import type { Resposta } from './offline/fila';
import './estilo/index.css';

ouvirInstalacao();

const router = createRouter({
  routeTree,
  scrollRestoration: true,
  /* Encostou o dedo num link, o código da tela já começa a vir. */
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  /* Transição com sentido (DESIGN.md §6): entrar numa tela desliza da
     direita, voltar faz o inverso, trocar de aba só esmaece. Navegador
     sem View Transitions troca na hora. */
  defaultViewTransition: {
    types: ({ fromLocation, toLocation, pathChanged }) => {
      if (!pathChanged || !fromLocation) return false;
      if (ehRaiz(fromLocation.pathname) && ehRaiz(toLocation.pathname)) return ['aba'];
      const de = fromLocation.state.__TSR_index ?? 0, para = toLocation.state.__TSR_index ?? 0;
      return [para < de ? 'voltar' : para > de ? 'ir' : 'aba'];
    },
  },
});

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
  interface HistoryState {
    /* Resultado da chamada, da lista para a tela de "salva". */
    chamada?: { turma: string; offline: boolean; resposta?: Resposta; presentes: number; total: number; viaQr: boolean };
  }
}

/* O servidor disse que a sessão acabou: login, e depois volta para onde
   estava. O cache fica — é da equipe, e a chamada sem internet precisa dele. */
quandoSessaoCair(() => {
  const aqui = router.state.location.href;
  if (router.state.location.pathname === '/entrar') return;
  folha.fechar();
  router.navigate({ to: '/entrar', search: { volta: aqui, aviso: 1 }, replace: true });
});

/* O toast vivia além da tela que o mostrou: "Desfazer" rodava sobre uma
   tela que não existe mais. Trocou de tela, fecha. */
router.subscribe('onResolved', (e) => {
  if (e.pathChanged) { fecharToast(); folha.fechar(); }
});

ligarEnvioAutomatico();

/* Transição interrompida porque a tela mudou de tamanho no meio (teclado
   abrindo, barra do navegador recolhendo) não é erro: a tela nova já está
   lá, só não animou. */
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason as { name?: string; message?: string } | undefined;
  if (r?.name === 'InvalidStateError' && /transition/i.test(r.message || '')) e.preventDefault();
});

/* Só no mock: o cache à mão no console, para depurar. */
if (import.meta.env.VITE_MOCK === '1') (window as unknown as { __qc: typeof queryClient }).__qc = queryClient;

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: GUARDA_MS,
        /* Mudou o formato dos dados guardados? Troque o buster. */
        buster: 'v3',
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === 'success' && PERSISTIDAS.has(String(q.queryKey[0])),
        },
      }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>,
);
