/* Sessão: o token que sai do login e vai na frente de toda chamada ao
   servidor, igual ao app HTML (AppEntrada.html).

   Fica no localStorage — agora existe, o iframe do Apps Script não
   tinha — e uma cópia no IndexedDB, porque o service worker não lê
   localStorage e precisa da sessão para enviar a fila sozinho. */
import { useSyncExternalStore } from 'react';
import { set as idbSet, del as idbDel } from 'idb-keyval';

export type Usuario = { nome: string; email: string };
type Estado = { sessao: string; usuario: Usuario | null };

const CHAVE_SESSAO = 'veridiana.sessao';
const CHAVE_USUARIO = 'veridiana.usuario';
export const IDB_SESSAO = 'sessao';

function lerGuardada(): Estado {
  try {
    const t = localStorage.getItem(CHAVE_SESSAO) || '';
    const u = JSON.parse(localStorage.getItem(CHAVE_USUARIO) || 'null');
    return { sessao: t, usuario: u && u.nome ? u : null };
  } catch {
    return { sessao: '', usuario: null };
  }
}

let estado: Estado = lerGuardada();
const ouvintes = new Set<() => void>();
function avisar() { ouvintes.forEach((f) => f()); }

export function sessaoAtual(): string { return estado.sessao; }
export function usuarioAtual(): Usuario | null { return estado.usuario; }

export function usarSessao(token: string, usuario: Usuario) {
  estado = { sessao: token, usuario };
  try {
    localStorage.setItem(CHAVE_SESSAO, token);
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
  } catch { /* sem guardar: pede login na próxima vez, nada quebra */ }
  idbSet(IDB_SESSAO, token).catch(() => {});
  avisar();
}

/* Sessão só de troca de senha (senha temporária): vale para a próxima
   tela, não é guardada. */
export function usarSessaoDeTroca(token: string, usuario: Usuario) {
  estado = { sessao: token, usuario };
  avisar();
}

export function atualizarUsuario(usuario: Usuario) {
  if (!estado.sessao) return;
  usarSessao(estado.sessao, usuario);
}

export function esquecerSessao() {
  estado = { sessao: '', usuario: null };
  try {
    localStorage.removeItem(CHAVE_SESSAO);
    localStorage.removeItem(CHAVE_USUARIO);
  } catch { /* nada */ }
  idbDel(IDB_SESSAO).catch(() => {});
  avisar();
}

function assinar(f: () => void) { ouvintes.add(f); return () => { ouvintes.delete(f); }; }

export function useSessao(): Estado {
  return useSyncExternalStore(assinar, () => estado);
}

/* Quem decide para onde ir quando o servidor diz que a sessão acabou
   (senha trocada em outro aparelho, pessoa saiu da equipe). O main.tsx
   liga isto ao roteador. */
let aoCair: () => void = () => {};
export function quandoSessaoCair(f: () => void) { aoCair = f; }
export function sessaoCaiu() {
  if (!estado.sessao) return;
  esquecerSessao();
  aoCair();
}

/* A senha temporária do primeiro acesso fica só na memória, para a tela
   de criar senha não pedi-la de novo. */
let senhaTemp = '';
export function guardarSenhaTemp(s: string) { senhaTemp = s; }
export function pegarSenhaTemp(): string { return senhaTemp; }
