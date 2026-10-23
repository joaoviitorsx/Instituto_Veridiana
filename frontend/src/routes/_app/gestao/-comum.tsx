/* O que as telas da gestão dividem: tipos do servidor e a escrita com aviso. */
import { escrever } from '../../../api/cliente';
import { toast } from '../../../ui/toast';
import { textoErro, vibrar } from '../../../util';

export type ResumoGestao = { turmas: number; alunosAtivos: number; alunosInativos: number; professores: number };
export type TurmaGestao = { nome: string; ativos: number; inativos: number };
export type Aluno = {
  nome: string; turma: string; ativo: boolean;
  nascimento?: string; responsavel?: string; telefone?: string;
};
export type Pessoa = { nome: string; email: string; situacao: 'ativo' | 'pendente' | 'sem-acesso' };
export type Aniversario = { aluno: string; turma: string; dia: string; faz: number };

/* Escrita da gestão: toast vermelho no erro, tela intacta. Deu certo,
   o cache inteiro cai (escrever → invalidarDepoisDe) e as listas abertas
   se relêem sozinhas — era o recarregarLista() do app HTML.
   Devolve { r } se gravou, null se não. */
export async function gravar<T = unknown>(fn: string, args: unknown[], msgOk: string): Promise<{ r: T } | null> {
  try {
    const r = await escrever<T>(fn, args);
    vibrar();
    if (msgOk) toast(msgOk);
    return { r };
  } catch (e) {
    toast(textoErro(e), 'erro');
    return null;
  }
}

/* Compartilhar do sistema; sem ele (desktop), copia. */
export async function partilhar(dados: ShareData, copiar: () => void) {
  if (!navigator.share) { copiar(); return; }
  try { await navigator.share(dados); } catch { /* cancelou: silêncio */ }
}
