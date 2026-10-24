/* Fila de chamadas guardadas no celular.

   Salvar sem internet grava aqui, e o envio acontece sozinho: quando a
   conexão volta (evento online), quando o app abre, e pelo Background
   Sync do service worker onde houver. Falha nunca descarta o item.

   Cada item carrega:
   - token: o mesmo que o servidor usa contra gravação duplicada. Gerado
     no celular e reaproveitado em todo reenvio — é ele (e o registro)
     que garante que o reenvio automático não grave a turma duas vezes.
   - registro: a hora real em que a chamada foi salva, no celular. O
     servidor grava a aula nesse dia, não no dia do envio.

   Este arquivo roda na página E no service worker: nada de window,
   localStorage ou React aqui. */
import { createStore, get, set, del, entries } from 'idb-keyval';

export type Presenca = { aluno: string; status: 'Presente' | 'Falta' | 'Justificada' };

export type ItemFila = {
  token: string;
  turma: string;
  professor: string;
  presencas: Presenca[];
  registro: number;
  forcar: boolean;
  /* Correção da chamada de hoje: troca a que já está na planilha. */
  substituir?: boolean;
  tentativas: number;
  /* pendente: vai sozinho. As outras esperam a pessoa decidir. */
  situacao: 'pendente' | 'duplicada' | 'antiga' | 'recusada';
  erro?: string;
  ultimaTentativa?: number;
};

export type Resposta = { ok: boolean; turma: string; professor: string; data: string; total: number; presentes: number; faltas: number };

const loja = createStore('veridiana-fila', 'chamadas');
const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('veridiana-fila') : null;
export const TAG_SYNC = 'enviar-chamadas';

/* Avisa a página (e outras abas) que a fila mudou. */
function mudou(evento: EventoFila) { canal?.postMessage(evento); ouvintesLocais.forEach((f) => f(evento)); }
export type EventoFila = { tipo: 'mudou' } | { tipo: 'enviada'; item: ItemFila; resposta: Resposta };
const ouvintesLocais = new Set<(e: EventoFila) => void>();
export function ouvirFila(f: (e: EventoFila) => void): () => void {
  ouvintesLocais.add(f);
  const h = (m: MessageEvent) => f(m.data);
  canal?.addEventListener('message', h);
  return () => { ouvintesLocais.delete(f); canal?.removeEventListener('message', h); };
}

export async function listarFila(): Promise<ItemFila[]> {
  const e = await entries<string, ItemFila>(loja);
  return e.map(([, v]) => v).sort((a, b) => a.registro - b.registro);
}

export async function guardarNaFila(item: Omit<ItemFila, 'tentativas' | 'situacao'>): Promise<ItemFila> {
  const completo: ItemFila = { ...item, tentativas: 0, situacao: 'pendente' };
  await set(item.token, completo, loja);
  mudou({ tipo: 'mudou' });
  return completo;
}

export async function tirarDaFila(token: string) {
  await del(token, loja);
  mudou({ tipo: 'mudou' });
}

async function atualizar(token: string, f: (i: ItemFila) => ItemFila) {
  const i = await get<ItemFila>(token, loja);
  if (!i) return;
  await set(token, f(i), loja);
  mudou({ tipo: 'mudou' });
}

/* Duplicada: a pessoa decidiu gravar assim mesmo. */
export function forcarItem(token: string) {
  return atualizar(token, (i) => ({ ...i, forcar: true, situacao: 'pendente', erro: undefined }));
}
export function reativarItem(token: string) {
  return atualizar(token, (i) => ({ ...i, situacao: 'pendente', erro: undefined }));
}

/* O que mandar ao servidor: os mesmos dados do app HTML, mais o registro. */
export function dadosDoItem(i: ItemFila) {
  return { turma: i.turma, professor: i.professor, token: i.token, presencas: i.presencas, forcar: i.forcar,
    registro: i.registro, substituir: i.substituir || undefined };
}

export type Envio = (dados: ReturnType<typeof dadosDoItem>) => Promise<Resposta>;
export type Classifica = (e: unknown) => 'rede' | 'sessao' | 'outro';

/* Manda o que estiver pendente, em ordem. Para no primeiro erro de rede
   ou de sessão: sem conexão, o resto também não vai. Com Web Locks,
   página e service worker nunca enviam ao mesmo tempo (e, se enviassem,
   o token segura no servidor). Devolve quantas foram. */
export async function enviarFila(enviar: Envio, classificar: Classifica, pular?: Set<string>): Promise<number> {
  const rodar = async () => {
    let foram = 0;
    for (const item of await listarFila()) {
      if (item.situacao !== 'pendente' || pular?.has(item.token)) continue;
      try {
        const r = await enviar(dadosDoItem(item));
        await del(item.token, loja);
        foram++;
        mudou({ tipo: 'enviada', item, resposta: r });
      } catch (e) {
        const tipo = classificar(e);
        const msg = String((e as Error)?.message || e).replace(/^\s*Error:\s*/, '');
        if (tipo === 'rede') {
          await atualizar(item.token, (i) => ({ ...i, tentativas: i.tentativas + 1, ultimaTentativa: Date.now() }));
          break;
        }
        if (tipo === 'sessao') break;   // volta a valer depois do login
        const situacao = /^DUPLICADA/.test(msg) ? 'duplicada' : /^ANTIGA/.test(msg) ? 'antiga' : 'recusada';
        await atualizar(item.token, (i) => ({
          ...i, situacao, erro: msg.replace(/^(DUPLICADA|ANTIGA):\s*/, ''),
          tentativas: i.tentativas + 1, ultimaTentativa: Date.now(),
        }));
      }
    }
    return foram;
  };
  const locks = (globalThis as { navigator?: { locks?: LockManager } }).navigator?.locks;
  if (locks) return locks.request('veridiana-fila', rodar);
  return rodar();
}
