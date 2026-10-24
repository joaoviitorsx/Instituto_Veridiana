/* O DNA da tela inicial, para as telas raiz (abas) usarem igual
   (DESIGN.md §16):

   <Tela roxo solto capa={<Heroi sobre="Boa noite," titulo="Vera" pilulas={[...]} direita={...} />}>
     <Sobreposto><div className={CARTAO_ELEVADO}>o cartão principal</div></Sobreposto>
     <Corpo>
       <Atalhos itens={[...]} />
       <CabecalhoSecao titulo="Hoje na grade" acao={{ txt: 'Ver semana', onClick }} />
       ...
     </Corpo>
   </Tela>

   - Heroi: roxo de marca, título grande, pílulas de resumo, a bailarina
     do logo ao fundo bem apagada. Deixa espaço embaixo para o cartão
     principal se sobrepor à borda (Sobreposto).
   - Atalhos: botões quadrados arredondados com rótulo, para as tarefas
     da tela — ao alcance do polegar, como nos apps de banco.
   - CabecalhoSecao: versalete à esquerda, link de ação à direita. */
import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { Logo } from './Logo';
import { CARTAO } from './kit';

export const CARTAO_ELEVADO =
  'rounded-2xl border border-borda bg-papel shadow-[0_12px_32px_rgba(27,16,32,.14),0_2px_6px_rgba(27,16,32,.06)]';

export type Pilula = { icone?: LucideIcon; texto: ReactNode };

export function Heroi({ sobre, titulo, pilulas, direita, sobreposto = true, children }: {
  /* Linha pequena acima do título ("Boa noite,", "Outubro de 2026"). */
  sobre?: ReactNode;
  titulo: ReactNode;
  pilulas?: (Pilula | false | null | undefined)[];
  /* À direita do título: avatar, botão redondo de ação. */
  direita?: ReactNode;
  /* false quando a tela não tem cartão para sobrepor. */
  sobreposto?: boolean;
  children?: ReactNode;
}) {
  const ps = (pilulas || []).filter(Boolean) as Pilula[];
  return (
    <div className={clsx('sobre-roxo relative overflow-hidden bg-roxo px-5 pt-2 text-white',
      sobreposto ? 'pb-16 baixo:pb-14' : 'pb-6')}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-6 -right-12 size-60 text-white opacity-[.07] [&_.logo]:size-full">
        <Logo />
      </span>
      <div className="relative mx-auto max-w-[620px]">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {sobre && <p className="text-[15px] font-medium text-roxo-claro">{sobre}</p>}
            <h1 className="text-[32px] leading-[1.1] font-extrabold tracking-tight hyphens-auto [overflow-wrap:anywhere] baixo:text-2xl">
              {titulo}
            </h1>
          </div>
          {direita}
        </div>
        {ps.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {ps.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[13px] font-semibold">
                {p.icone && <p.icone size={15} />} {p.texto}
              </span>
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* Botão redondo no canto do Heroi (avatar, "+", filtro). */
export function BotaoHeroi({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={rotulo}
      className="grid size-12 shrink-0 place-items-center rounded-full bg-white/15 text-base font-bold ring-2 ring-white/25 active:bg-white/25">
      {children}
    </button>
  );
}

/* O cartão principal, por cima da borda do Heroi. */
export function Sobreposto({ children }: { children: ReactNode }) {
  return <div className="relative mx-auto -mt-12 max-w-[620px] px-4">{children}</div>;
}

/* A coluna de conteúdo das telas com Heroi (Tela solto). */
export function Corpo({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mx-auto max-w-[620px] px-4 pt-4', className)}>{children}</div>;
}

export type Atalho = { icone: LucideIcon; texto: string; to?: string; search?: Record<string, unknown>; onClick?: () => void };

/* Até 4 por linha; rótulo de até duas linhas, sempre visível. */
export function Atalhos({ itens, className }: { itens: Atalho[]; className?: string }) {
  const caixa = clsx(CARTAO, 'grid size-14 place-items-center rounded-2xl text-roxo transition-colors duration-150 group-active:bg-roxo-fraco');
  const rotulo = 'text-xs leading-tight font-semibold text-tinta';
  return (
    <ul className={clsx('mb-6 grid grid-cols-4 gap-2', className)} aria-label="Atalhos">
      {itens.map((a) => (
        <li key={a.texto}>
          {a.to ? (
            <Link to={a.to} search={a.search as never} className="group flex flex-col items-center gap-1.5 rounded-m py-1 text-center">
              <span className={caixa}><a.icone size={24} strokeWidth={2.1} /></span>
              <span className={rotulo}>{a.texto}</span>
            </Link>
          ) : (
            <button type="button" onClick={a.onClick} className="group flex w-full flex-col items-center gap-1.5 rounded-m py-1 text-center">
              <span className={caixa}><a.icone size={24} strokeWidth={2.1} /></span>
              <span className={rotulo}>{a.texto}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CabecalhoSecao({ titulo, acao, className }: {
  titulo: ReactNode; acao?: { txt: string; onClick: () => void }; className?: string;
}) {
  return (
    <div className={clsx('mb-0.5 flex min-h-11 items-center justify-between pl-4', className)}>
      <h2 className="text-[13px] font-semibold tracking-wide text-apagado uppercase">{titulo}</h2>
      {acao && (
        <button type="button" onClick={acao.onClick} className="-mr-1 flex min-h-11 items-center gap-0.5 px-2 text-sm font-bold text-roxo">
          {acao.txt} <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
