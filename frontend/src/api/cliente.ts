/* Ponte com o Apps Script + cache de leitura (TanStack Query).

   Toda função do servidor recebe a sessão na frente, como no app HTML.
   Só o login não: é de lá que ela sai.

   Leitura: useQuery(leitura('carregarTurma', turma)). A chave da query é
   [função, ...args], e a queryFn é a própria chamada. Tela já vista
   aparece na hora com o que tinha, e o dado novo chega por trás.

   Escrita: useEscrita('salvarChamada'). Deu certo, derruba do cache o que
   ela mudou (INVALIDA) — igual ao AppNucleo.html. */
import { QueryClient, queryOptions, useMutation } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { transportar, ErroRede, ErroConfig } from './transporte';
import { sessaoAtual, sessaoCaiu } from '../sessao';

export { ErroRede, ErroConfig };

const ABERTAS = new Set(['entrar']);

export function ehErroSessao(e: unknown): boolean {
  return /^\s*(Error:\s*)?SESSAO:/.test(String((e as Error)?.message || ''));
}
export function ehErroRede(e: unknown): boolean {
  return e instanceof ErroRede;
}

type Opcoes = {
  /* ms. Gerar PDF passa mais: o Drive leva seus segundos. */
  prazo?: number;
  /* Não manda para o login quando a sessão cai (envio da fila em
     segundo plano não pode arrancar a pessoa da tela). */
  silencioso?: boolean;
};

export async function api<T = unknown>(fn: string, args: unknown[] = [], o: Opcoes = {}): Promise<T> {
  const chamada = ABERTAS.has(fn) ? args : [sessaoAtual(), ...args];
  try {
    return (await transportar(fn, chamada, o.prazo ?? 25000)) as T;
  } catch (e) {
    if (!o.silencioso && ehErroSessao(e)) sessaoCaiu();
    throw e;
  }
}

/* ─── leitura ─── */
export function leitura<T>(fn: string, ...args: unknown[]) {
  return queryOptions<T>({
    queryKey: [fn, ...args],
    queryFn: () => api<T>(fn, args),
  });
}

export const GUARDA_MS = 1000 * 60 * 60 * 24 * 20;   // 20 dias

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /* Chegou há pouco: voltar para uma tela recém-vista não gasta 4G. */
      staleTime: 20_000,
      /* O que fica no aparelho vive isso. Não passe de ~24 dias: o
         TanStack agenda a coleta num setTimeout, e acima de 2^31 ms o
         timer estoura e apaga o cache na hora. */
      gcTime: GUARDA_MS,
      refetchOnWindowFocus: false,
      /* Rede: uma tentativa a mais. Erro do servidor (mensagem em
         português para a pessoa) não melhora tentando de novo. */
      retry: (n, e) => e instanceof ErroRede && n < 1,
      /* Sem internet, tenta mesmo assim e falha com ErroRede: a tela mostra
         "Sem conexão · Tentar de novo". No modo padrão ('online') a busca
         ficava pausada, e tela nunca aberta mostrava esqueleto para sempre. */
      networkMode: 'offlineFirst',
    },
    mutations: { retry: false, networkMode: 'offlineFirst' },
  },
});

/* O que fica no aparelho entre uma abertura e outra (IndexedDB). Só o
   que a chamada precisa para funcionar sem internet: a lista de turmas
   e o elenco de cada uma, com a data em que vieram (dataUpdatedAt). O
   resto pede conexão. */
export const PERSISTIDAS = new Set(['listarTurmas', 'carregarTurma', 'resumoInicial', 'listarGrade']);
export const persister = createAsyncStoragePersister({
  storage: { getItem: (k) => get(k), setItem: (k, v) => set(k, v), removeItem: (k) => del(k) },
  key: 'veridiana.cache',
  throttleTime: 800,
});

/* ─── escrita ─── */
const CHAMADAS_L = ['carregarTurma', 'resumoInicial', 'contarRisco', 'alunosEmRisco', 'mesesComChamada',
  'resumoHistorico', 'alunosParaCertificado', 'relatorioPeriodo', 'listarGrade'];
const GRADE_L = ['listarGrade', 'resumoInicial'];
const CAIXA_L = ['mesesCaixa', 'listarCaixa', 'resumoCaixa', 'resumoInicial'];
const MATERIAIS_L = ['listarMateriais', 'listarCategorias', 'listarLocais', 'resumoInicial'];
const AGENDA_L = ['listarAgenda', 'listarAgendaAno', 'datasFixas', 'resumoInicial'];

/* O que cada escrita invalida. Escrita que não está aqui (cadastros da
   gestão, que mexem em quase tudo) derruba o cache inteiro. */
const INVALIDA: Record<string, string[]> = {
  salvarChamada: CHAMADAS_L,
  lancarCaixa: CAIXA_L, apagarLancamento: CAIXA_L,
  criarMaterial: MATERIAIS_L, editarMaterial: MATERIAIS_L, ajustarQuantidade: MATERIAIS_L,
  inativarMaterial: MATERIAIS_L, renomearNaLista: MATERIAIS_L,
  criarEvento: AGENDA_L, editarEvento: AGENDA_L, excluirEvento: AGENDA_L, precarregarDatas: AGENDA_L,
  criarHorario: GRADE_L, editarHorario: GRADE_L, excluirHorario: GRADE_L,
  gerarCertificado: [], gerarCalendarioPdf: [], sair: [], trocarSenha: [], entrar: [],
};

export function invalidarDepoisDe(fn: string) {
  const l = INVALIDA[fn];
  if (!l) { queryClient.invalidateQueries(); return; }
  l.forEach((nome) => queryClient.invalidateQueries({ queryKey: [nome] }));
}

export async function escrever<T = unknown>(fn: string, args: unknown[] = [], o: Opcoes = {}): Promise<T> {
  const r = await api<T>(fn, args, o);
  invalidarDepoisDe(fn);
  return r;
}

/* useEscrita('criarEvento').mutate([dados]) — os args vão como lista,
   na ordem do servidor, sem a sessão. */
export function useEscrita<T = unknown>(fn: string, o: Opcoes = {}) {
  return useMutation<T, Error, unknown[]>({
    mutationFn: (args) => api<T>(fn, args, o),
    onSuccess: () => invalidarDepoisDe(fn),
  });
}

/* Sair ou trocar de pessoa: nada de quem estava antes fica no aparelho. */
export async function limparCache() {
  queryClient.clear();
  await persister.removeClient();
}
