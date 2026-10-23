/* Peças visuais reaproveitadas pelas telas. Tailwind com os tokens de
   src/estilo/index.css; a aparência segue a do app HTML (Estilo.html).

   Alvo: Android intermediário, tela de 380px, dedo de quem nunca usou
   app. Toda área tocável tem no mínimo 44px. */
import { useState, type ComponentProps, type ReactNode } from 'react';
import { ChevronRight, Eye, Search, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { iniciais } from '../util';

export const CLASSE_INPUT =
  'w-full min-h-13 rounded-m border border-borda bg-papel px-4 py-3 text-base text-tinta ' +
  'focus:border-roxo focus:outline-none focus:ring-3 focus:ring-roxo-fraco';

/* ─── superfícies ─── */
export const CARTAO = 'rounded-m border border-borda bg-papel shadow-cartao';

export function Cartao({ className, ...p }: ComponentProps<'div'>) {
  return <div className={clsx(CARTAO, className)} {...p} />;
}

/* Uma superfície só, com fios internos: lista de aplicativo, não vinte
   cartões flutuando. semAvatar alinha o fio com o texto. */
export function Lista({ className, semAvatar, ...p }: ComponentProps<'ul'> & { semAvatar?: boolean }) {
  return (
    <ul
      className={clsx(CARTAO, 'mb-4 overflow-hidden', semAvatar ? '[--fio:16px]' : '[--fio:68px]', className)}
      {...p}
    />
  );
}

type Tom = 'presente' | 'justif' | 'falta' | 'neutro';
const FUNDO_TOM: Record<Tom, string> = {
  presente: 'bg-presente-fraco active:bg-[#D3E8DC]',
  justif: 'bg-justif-fraco active:bg-[#F5EAD3]',
  falta: 'active:bg-roxo-fraco',
  neutro: 'active:bg-roxo-fraco',
};

/* Linha da lista. Com onClick vira botão (teclado incluso). */
export function Linha({ esquerda, titulo, sub, direita, onClick, tom = 'neutro', rotulo, className }: {
  esquerda?: ReactNode; titulo: ReactNode; sub?: ReactNode; direita?: ReactNode;
  onClick?: () => void; tom?: Tom; rotulo?: string; className?: string;
}) {
  const interativo = !!onClick;
  return (
    <li
      role={interativo ? 'button' : undefined}
      tabIndex={interativo ? 0 : undefined}
      aria-label={rotulo}
      onClick={onClick}
      onKeyDown={interativo ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!(); } } : undefined}
      className={clsx(
        'relative flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-150 ease-curva',
        'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-(--fio)',
        'not-first:before:h-px not-first:before:bg-borda not-first:before:content-[""]',
        interativo && 'cursor-pointer',
        FUNDO_TOM[tom],
        className,
      )}
    >
      {esquerda}
      <span className="min-w-0 flex-1 text-base leading-tight font-semibold [overflow-wrap:anywhere]">
        {titulo}
        {sub && <small className="mt-0.5 block text-[13px] font-normal text-apagado">{sub}</small>}
      </span>
      {direita}
    </li>
  );
}

export function Avatar({ nome, tom, pequeno, className }: {
  nome: string; tom?: 'presente' | 'falta' | 'justif' | 'perigo'; pequeno?: boolean; className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'grid shrink-0 place-items-center rounded-full text-[13px] font-bold tracking-wide transition-colors duration-150',
        pequeno ? 'size-[34px]' : 'size-10',
        tom === 'presente' ? 'bg-presente text-white'
          : tom === 'justif' ? 'bg-justif text-white'
            : tom === 'falta' ? 'bg-fundo text-apagado'
              : tom === 'perigo' ? 'bg-falta text-white'
                : 'bg-roxo-fraco text-roxo',
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

export function Seta() {
  return <ChevronRight size={20} className="shrink-0 text-apagado" aria-hidden="true" />;
}

/* Cartões de navegação (lista de turmas, menu da gestão). */
export function CartaoNav({ titulo, sub, icone: Ic, onClick, direita }: {
  titulo: ReactNode; sub?: ReactNode; icone?: LucideIcon; onClick: () => void; direita?: ReactNode;
}) {
  return (
    <li className="mb-3">
      <button
        type="button"
        onClick={onClick}
        className={clsx(CARTAO, 'flex min-h-16 w-full items-center gap-3 p-4 text-left text-[17px] font-semibold',
          'transition-colors duration-150 ease-curva active:bg-fundo')}
      >
        {Ic && (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-roxo-fraco text-roxo">
            <Ic size={20} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          {titulo}
          {sub && <small className="mt-0.5 block text-[13px] font-normal text-apagado">{sub}</small>}
        </span>
        {direita ?? <Seta />}
      </button>
    </li>
  );
}

/* ─── estados de tela inteira ─── */
export function Estado({ icone: Ic, titulo, texto, botao }: {
  icone: LucideIcon; titulo: string; texto?: ReactNode; botao?: { txt: string; fn: () => void };
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-roxo-fraco text-roxo">
        <Ic size={30} />
      </div>
      <h2 className="mb-2 text-[21px] font-bold tracking-tight">{titulo}</h2>
      {texto && <p className="text-[15px] leading-normal text-apagado">{texto}</p>}
      {botao && (
        <button type="button" onClick={botao.fn}
          className={clsx(CARTAO, 'mt-6 inline-block min-h-13 px-6 py-4 text-base font-semibold text-roxo')}>
          {botao.txt}
        </button>
      )}
    </div>
  );
}

/* Pulso de opacidade, não brilho correndo: em Android fraco, opacidade
   vai para a GPU e não disputa CPU com a resposta que está chegando. */
export function Osso({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={clsx('animate-pulso rounded-p bg-osso', className)} style={style} />;
}
export function Esqueleto({ n = 6 }: { n?: number }) {
  return (
    <ul className={clsx(CARTAO, 'mb-4 overflow-hidden')} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="flex min-h-16 items-center gap-3 px-4 py-3 not-first:border-t not-first:border-borda">
          <Osso className="size-10 shrink-0 rounded-full" />
          <div className="flex-1"><Osso className="h-3.5" style={{ maxWidth: `${48 + (i * 17) % 38}%` }} /></div>
          <Osso className="size-[26px] shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/* Faixa âmbar: atenção sem alarme. */
export function Aviso({ icone: Ic, children, className }: { icone?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('mb-4 flex items-start gap-3 rounded-m border border-justif-borda bg-justif-fraco px-4 py-3',
      'text-sm text-justif-tinta', className)}>
      {Ic && <Ic size={18} className="mt-0.5 shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Secao({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={clsx('mx-1 mt-6 mb-2 flex items-center gap-2 text-sm font-semibold text-apagado', className)}>{children}</h3>;
}

/* ─── botões ─── */
export function BotaoCheio({ className, icone: Ic, children, ...p }: ComponentProps<'button'> & { icone?: LucideIcon }) {
  return (
    <button type="button"
      className={clsx('flex min-h-13 w-full items-center justify-center gap-2 rounded-m bg-roxo p-4 text-base font-bold text-white',
        'transition-colors duration-150 ease-curva active:bg-roxo-fundo disabled:bg-roxo-apagado', className)}
      {...p}>
      {Ic && <Ic size={20} />}{children}
    </button>
  );
}
export function BotaoContorno({ className, icone: Ic, children, ...p }: ComponentProps<'button'> & { icone?: LucideIcon }) {
  return (
    <button type="button"
      className={clsx('flex min-h-13 w-full items-center justify-center gap-2 rounded-m border border-borda bg-papel p-4',
        'text-base font-bold text-roxo transition-colors duration-150 ease-curva active:bg-fundo disabled:opacity-50', className)}
      {...p}>
      {Ic && <Ic size={20} />}{children}
    </button>
  );
}

/* ─── campos ─── */
export function Campo({ rotulo, id, dica, className, ...p }: ComponentProps<'input'> & { rotulo: ReactNode; id: string; dica?: ReactNode }) {
  return (
    <div className={clsx('mb-4', className)}>
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-apagado">{rotulo}</label>
      <input id={id} className={CLASSE_INPUT} {...p} />
      {dica && <span className="mt-2 block text-[13px] leading-normal text-apagado">{dica}</span>}
    </div>
  );
}

export function CampoSenha({ rotulo, id, ...p }: ComponentProps<'input'> & { rotulo: string; id: string }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-apagado">{rotulo}</label>
      <div className="relative">
        <input id={id} type={ver ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false}
          className={clsx(CLASSE_INPUT, 'pr-13')} {...p} />
        <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}
          className={clsx('absolute inset-y-0 right-0 grid w-13 place-items-center rounded-r-m', ver ? 'text-roxo' : 'text-apagado')}>
          <Eye size={20} />
        </button>
      </div>
    </div>
  );
}

export function Busca({ className, ...p }: ComponentProps<'input'>) {
  return (
    <div className={clsx('relative mb-4', className)}>
      <Search size={20} className="pointer-events-none absolute top-1/2 left-4 -mt-2.5 text-apagado" />
      <input type="search" autoComplete="off" className={clsx(CLASSE_INPUT, 'pl-[46px] [&::-webkit-search-cancel-button]:appearance-none')} {...p} />
    </div>
  );
}

/* Abas de filtro lado a lado. */
export function Filtro<T extends string>({ valor, opcoes, onChange }: {
  valor: T; opcoes: { v: T; txt: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="mb-4 flex gap-2">
      {opcoes.map((o) => (
        <button key={o.v} type="button" role="tab" aria-selected={valor === o.v} onClick={() => onChange(o.v)}
          className={clsx('min-h-11 flex-1 rounded-p border text-sm font-semibold transition-colors duration-150',
            valor === o.v ? 'border-roxo bg-roxo text-white' : 'border-borda bg-papel text-apagado')}>
          {o.txt}
        </button>
      ))}
    </div>
  );
}

export function Chip({ ligado, className, ...p }: ComponentProps<'button'> & { ligado?: boolean }) {
  return (
    <button type="button" aria-pressed={ligado}
      className={clsx('min-h-11 rounded-full border px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150',
        ligado ? 'border-roxo bg-roxo text-white' : 'border-borda bg-fundo text-apagado', className)}
      {...p} />
  );
}

/* ─── números em destaque, sobre roxo ─── */
export function Numeros({ itens }: { itens: { n: ReactNode; txt: string }[] }) {
  return (
    <div className="flex gap-2">
      {itens.map((x, i) => (
        <div key={i} className="flex-1 rounded-m bg-roxo px-2 py-4 text-center text-white">
          <b className="block text-2xl font-bold tracking-tight tabular-nums">{x.n}</b>
          <span className="mt-1 block text-xs text-roxo-claro">{x.txt}</span>
        </div>
      ))}
    </div>
  );
}
