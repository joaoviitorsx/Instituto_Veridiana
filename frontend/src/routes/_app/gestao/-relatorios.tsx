/* Peças das telas de leitura da gestão (histórico, atenção, relatório)
   e dos certificados. O '-' no nome tira este arquivo das rotas. */
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { escrever, leitura, queryClient } from '../../../api/cliente';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { CARTAO } from '../../../ui/kit';
import { CARTAO_ELEVADO } from '../../../ui/Heroi';
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

/* O número que resume a tela, no cartão principal (CARTAO_ELEVADO, como o
   cartão de destaque do Início). Número grande em roxo, a frase embaixo. */
export function Resumo({ n, txt, icone: Ic }: { n: ReactNode; txt: ReactNode; icone?: LucideIcon }) {
  return (
    <div className={clsx(CARTAO_ELEVADO, 'flex items-center gap-4 p-5')}>
      {Ic && <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-roxo text-white"><Ic size={24} /></span>}
      <span className="min-w-0">
        <b className="block text-[34px] leading-none font-extrabold tracking-tighter text-roxo tabular-nums">{n}</b>
        <span className="mt-1.5 block text-sm text-apagado">{txt}</span>
      </span>
    </div>
  );
}

/* Vários números lado a lado num cartão só (o resumo do relatório). Fio
   entre eles em vez de três caixas roxas: um bloco, uma leitura. */
export function NumerosCartao({ itens }: { itens: { n: ReactNode; txt: string }[] }) {
  return (
    <div className={clsx(CARTAO_ELEVADO, 'flex divide-x divide-borda py-4')}>
      {itens.map((x, i) => (
        <div key={i} className="min-w-0 flex-1 px-2 text-center">
          <b className="block text-[26px] leading-none font-extrabold tracking-tight text-roxo tabular-nums">{x.n}</b>
          <span className="mt-1.5 block text-xs text-apagado">{x.txt}</span>
        </div>
      ))}
    </div>
  );
}

/* Coluna fixa à esquerda da linha (como a hora em "Hoje na grade" no
   Início): dia do mês grande, dia da semana embaixo. */
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export function ColunaDia({ iso }: { iso: string }) {
  const [a, m, d] = iso.split('-').map(Number);
  const semana = DIAS_CURTOS[new Date(a, m - 1, d).getDay()];
  return (
    <span className="w-10 shrink-0 text-center leading-tight" aria-hidden="true">
      <b className="block text-lg tabular-nums">{d}</b>
      <small className="block text-xs text-apagado">{semana}</small>
    </span>
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
    toast('Não deu para abrir os dados de ' + nome + '. ' + textoErro(e), 'erro');
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
      toast('Não salvou. ' + textoErro(e), 'erro');
    }
  });
}
