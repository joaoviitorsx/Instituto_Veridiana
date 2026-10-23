/* Peças das telas de leitura da gestão (histórico, atenção, relatório)
   e dos certificados. O '-' no nome tira este arquivo das rotas. */
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { escrever, leitura, queryClient } from '../../../api/cliente';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { CARTAO } from '../../../ui/kit';
import { textoErro, vibrar } from '../../../util';

/* Número à direita da linha: percentual, contagem. cheio = verde. */
export function Pct({ children, cheio, perigo }: { children: ReactNode; cheio?: boolean; perigo?: boolean }) {
  return (
    <span className={clsx('shrink-0 text-base font-bold tabular-nums',
      cheio ? 'text-presente' : perigo ? 'text-falta' : 'text-apagado')}>
      {children}
    </span>
  );
}

/* Bloco roxo com o número que resume a tela. */
export function Resumo({ n, txt }: { n: ReactNode; txt: ReactNode }) {
  return (
    <div className="rounded-m bg-roxo p-5 text-center text-white">
      <b className="block text-[32px] font-bold tracking-tighter tabular-nums">{n}</b>
      <span className="mt-1 block text-sm text-roxo-claro">{txt}</span>
    </div>
  );
}

/* Texto curto de apoio no topo da tela. */
export function Intro({ children }: { children: ReactNode }) {
  return <p className="mx-1 mb-4 text-sm leading-normal text-apagado">{children}</p>;
}

/* ‹ Outubro de 2026 › */
export function Passo({ rotulo, antes, depois }: {
  rotulo: string; antes?: () => void; depois?: () => void;
}) {
  const bt = 'grid size-11 shrink-0 place-items-center rounded-p text-roxo transition-colors duration-150 active:bg-roxo-fraco disabled:text-borda';
  return (
    <div className={clsx(CARTAO, 'mb-4 flex items-center justify-between gap-2 p-1')}>
      <button type="button" className={bt} onClick={antes} disabled={!antes} aria-label="Mês anterior">
        <ChevronLeft size={22} />
      </button>
      <b className="min-w-0 flex-1 text-center text-base font-bold tracking-tight">{rotulo}</b>
      <button type="button" className={bt} onClick={depois} disabled={!depois} aria-label="Próximo mês">
        <ChevronRight size={22} />
      </button>
    </div>
  );
}

type Aluno = { nome: string; turma: string; nascimento?: string; responsavel?: string; telefone?: string };

/* "Sem telefone — cadastrar": abre a ficha de contato do aluno ali mesmo.
   Busca os dados atuais antes: atualizarAluno grava os três campos de
   uma vez, e abrir a ficha em branco apagaria a data de nascimento. */
export async function editarContato(nome: string, turma: string) {
  let atual: Aluno | undefined;
  try {
    const lista = await queryClient.fetchQuery(leitura<Aluno[]>('listarAlunos', turma, true));
    atual = lista.find((a) => a.nome === nome && a.turma === turma);
  } catch (e) {
    toast(textoErro(e), 'erro');
    return;
  }
  folha.pedirFicha('Dados de ' + nome, [
    { id: 'nascimento', rotulo: 'Data de nascimento', tipo: 'date', valor: atual?.nascimento || '' },
    { id: 'responsavel', rotulo: 'Responsável', valor: atual?.responsavel || '' },
    { id: 'telefone', rotulo: 'Telefone com DDD', tipo: 'tel', dica: '85 9 9999 0000', valor: atual?.telefone || '' },
  ], 'Salvar', async (d) => {
    try {
      await escrever('atualizarAluno', [nome, turma, d]);
      vibrar();
      toast('Dados de ' + nome + ' salvos');
    } catch (e) {
      toast(textoErro(e), 'erro');
    }
  });
}
