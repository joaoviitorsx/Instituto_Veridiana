/* O cartão principal das telas raiz, por cima da borda do Heroi: a aula
   que está acontecendo (ou a próxima), o evento de hoje, ou como está o
   dia. Um só desenho para o Início e para a Chamada — antes cada tela
   tinha a sua cópia, com ícone diferente.

   CartaoAulaAgora: a aula, com o pulso verde quando é agora e o botão
   "Chamada". CartaoDestaque: a mesma moldura para o resto. */
import type { ReactNode } from 'react';
import { ChevronRight, Clock, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { CARTAO_ELEVADO } from './Heroi';

/* "Sala 3" nunca quebra entre a palavra e o número. */
export function semQuebra(s: string) { return s.replace(/ /g, ' '); }

/* "agora · até 16h30 · Sala 2" ou "começa às 15h · Sala 2". */
export function textoDaAula({ agora, inicio, fim, sala }: { agora: boolean; inicio?: string; fim?: string; sala?: string }) {
  const quando = agora ? (fim ? 'agora · até ' + fim : 'agora') : inicio ? 'começa às ' + inicio : 'hoje';
  return quando + (sala ? ' · ' + semQuebra(sala) : '');
}

export function CartaoDestaque({ icone: Ic, rotulo, titulo, sub, tom = 'roxo', acao, onClick }: {
  icone: LucideIcon; rotulo: ReactNode; titulo: ReactNode; sub?: ReactNode;
  /* agora: verde com pulso; roxo: destaque normal; suave: informativo; ok: tudo certo. */
  tom?: 'agora' | 'roxo' | 'suave' | 'ok';
  /* Texto do botão à direita (ex.: "Chamada"); sem ele, uma seta. */
  acao?: string;
  onClick: () => void;
}) {
  const verde = tom === 'agora' || tom === 'ok';
  return (
    <button type="button" onClick={onClick}
      className={clsx(CARTAO_ELEVADO, 'flex min-h-21 w-full items-center gap-3 p-4 text-left transition-colors duration-150 ease-curva active:bg-fundo')}>
      <span className={clsx('relative grid size-12 shrink-0 place-items-center rounded-2xl',
        verde ? 'bg-presente text-white' : tom === 'suave' ? 'bg-roxo-fraco text-roxo' : 'bg-roxo text-white')}>
        <Ic size={24} />
        {/* Pulso só na aula que está acontecendo: "é agora". */}
        {tom === 'agora' && <span className="absolute -top-1 -right-1 size-3.5 rounded-full border-2 border-papel bg-presente motion-safe:animate-pulse" />}
      </span>
      <span className="min-w-0 flex-1">
        <small className={clsx('block text-xs font-bold tracking-[.06em] uppercase', verde ? 'text-presente' : 'text-roxo')}>{rotulo}</small>
        <b className="mt-0.5 block text-lg leading-tight font-bold tracking-tight [overflow-wrap:break-word]">{titulo}</b>
        {sub && <span className="mt-0.5 block text-sm text-apagado">{sub}</span>}
      </span>
      {acao
        ? <span className="shrink-0 rounded-full bg-roxo px-3.5 py-2 text-sm font-bold text-white">{acao}</span>
        : <ChevronRight size={20} className="shrink-0 text-apagado" />}
    </button>
  );
}

export function CartaoAulaAgora({ turma, agora, sub, onClick }: {
  turma: string; agora: boolean; sub: ReactNode; onClick: () => void;
}) {
  return (
    <CartaoDestaque icone={Clock} tom={agora ? 'agora' : 'roxo'} rotulo={agora ? 'Aula agora' : 'Próxima aula'}
      titulo={turma} sub={sub} acao="Chamada" onClick={onClick} />
  );
}
