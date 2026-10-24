/* Peças visuais reaproveitadas pelas telas. Tailwind com os tokens de
   src/estilo/index.css; a aparência segue a do app HTML (Estilo.html).

   Alvo: Android intermediário, tela de 380px, dedo de quem nunca usou
   app. Toda área tocável tem no mínimo 44px. */
import { useState, type ComponentProps, type ReactNode } from 'react';
import { ChevronRight, CircleAlert, CircleCheck, Eye, EyeOff, Info, LoaderCircle, Search, TriangleAlert, type LucideIcon } from 'lucide-react';
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

/* Aviso dentro da tela ("banner" do Material 3). O tom diz o peso:
   - info: algo para saber, sem problema nenhum (roxo claro)
   - atencao: vale conferir antes de seguir (âmbar)
   - erro: não deu certo, e o texto diz o que fazer (vermelho claro)
   - sucesso: confirmação que fica na tela (verde claro)
   Título curto em negrito diz o quê; o texto diz o que fazer. Ícone num
   círculo, nunca só a cor (quem não distingue cores entende igual).
   Ação opcional, como botão de texto. */
export type TomBanner = 'info' | 'atencao' | 'erro' | 'sucesso';
const TOM: Record<TomBanner, { caixa: string; circulo: string; acao: string; Ic: LucideIcon }> = {
  info: { caixa: 'border-roxo/15 bg-roxo-fraco text-tinta', circulo: 'bg-roxo text-white', acao: 'text-roxo', Ic: Info },
  atencao: { caixa: 'border-justif-borda bg-justif-fraco text-justif-tinta', circulo: 'bg-justif text-white', acao: 'text-justif-tinta', Ic: TriangleAlert },
  erro: { caixa: 'border-falta/20 bg-falta-fraco text-[#6E1424]', circulo: 'bg-falta text-white', acao: 'text-falta', Ic: CircleAlert },
  sucesso: { caixa: 'border-presente/20 bg-presente-fraco text-[#0E4A31]', circulo: 'bg-presente text-white', acao: 'text-presente', Ic: CircleCheck },
};
export function Banner({ tom = 'info', titulo, children, icone, acao, className }: {
  tom?: TomBanner; titulo?: ReactNode; children?: ReactNode; icone?: LucideIcon;
  acao?: { txt: string; fn: () => void }; className?: string;
}) {
  const t = TOM[tom];
  const Ic = icone || t.Ic;
  return (
    <div role={tom === 'erro' ? 'alert' : 'status'}
      className={clsx('mb-4 flex items-start gap-3 rounded-m border px-4 py-3.5', t.caixa, className)}>
      <span className={clsx('grid size-8 shrink-0 place-items-center rounded-full', t.circulo)}><Ic size={17} strokeWidth={2.4} /></span>
      <div className="min-w-0 flex-1 pt-0.5 text-sm leading-snug">
        {titulo && <b className="mb-0.5 block text-[15px] leading-tight font-bold">{titulo}</b>}
        {children}
        {acao && (
          <button type="button" onClick={acao.fn}
            className={clsx('-ml-2 mt-1 block min-h-11 rounded-p px-2 text-sm font-bold active:bg-black/5', t.acao)}>
            {acao.txt}
          </button>
        )}
      </div>
    </div>
  );
}

/* Compatibilidade: o Aviso antigo é um Banner de atenção. */
export function Aviso({ icone, children, className }: { icone?: LucideIcon; children: ReactNode; className?: string }) {
  return <Banner tom="atencao" icone={icone} className={className}>{children}</Banner>;
}

export function Secao({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={clsx('mx-1 mt-6 mb-2 flex items-center gap-2 text-sm font-semibold text-apagado', className)}>{children}</h3>;
}

/* ─── botões ─── */
/* carregando: o botão fica desligado e mostra o giro no lugar do ícone,
   sem mudar de tamanho (o dedo não perde o alvo). */
export function BotaoCheio({ className, icone: Ic, children, carregando, disabled, ...p }:
  ComponentProps<'button'> & { icone?: LucideIcon; carregando?: boolean }) {
  return (
    <button type="button" disabled={disabled || carregando} aria-busy={carregando || undefined}
      className={clsx('flex min-h-13 w-full items-center justify-center gap-2 rounded-m bg-roxo p-4 text-base font-bold text-white',
        'transition-colors duration-150 ease-curva active:bg-roxo-fundo disabled:bg-roxo-apagado',
        carregando && 'disabled:bg-roxo/80', className)}
      {...p}>
      {carregando ? <LoaderCircle size={20} className="animate-spin" /> : Ic && <Ic size={20} />}{children}
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
type ExtrasCampo = { icone?: LucideIcon; erro?: ReactNode };

/* Erro embaixo do campo, com ícone (não só cor), ligado ao campo por
   aria-describedby: o leitor de tela lê junto. */
function ErroCampo({ id, erro }: { id: string; erro?: ReactNode }) {
  if (!erro) return null;
  return (
    <span id={id + '-erro'} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug font-medium text-falta">
      <CircleAlert size={16} className="mt-px shrink-0" />{erro}
    </span>
  );
}
/* Com "!": a borda roxa do foco (CLASSE_INPUT) não pode cobrir o vermelho do erro. */
const comErro = (erro?: ReactNode) => erro ? 'border-falta! focus:border-falta! focus:ring-falta-fraco!' : '';

export function Campo({ rotulo, id, dica, className, icone: Ic, erro, ...p }:
  ComponentProps<'input'> & { rotulo: ReactNode; id: string; dica?: ReactNode } & ExtrasCampo) {
  return (
    <div className={clsx('mb-4', className)}>
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-apagado">{rotulo}</label>
      <div className="relative">
        {Ic && <Ic size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-apagado" />}
        <input id={id} aria-invalid={erro ? true : undefined} aria-describedby={erro ? id + '-erro' : undefined}
          className={clsx(CLASSE_INPUT, Ic && 'pl-12', comErro(erro))} {...p} />
      </div>
      <ErroCampo id={id} erro={erro} />
      {dica && !erro && <span className="mt-2 block text-[13px] leading-normal text-apagado">{dica}</span>}
    </div>
  );
}

export function CampoSenha({ rotulo, id, icone: Ic, erro, ...p }: ComponentProps<'input'> & { rotulo: string; id: string } & ExtrasCampo) {
  const [ver, setVer] = useState(false);
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-apagado">{rotulo}</label>
      <div className="relative">
        {Ic && <Ic size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-apagado" />}
        <input id={id} type={ver ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false}
          aria-invalid={erro ? true : undefined} aria-describedby={erro ? id + '-erro' : undefined}
          className={clsx(CLASSE_INPUT, 'pr-13', Ic && 'pl-12', comErro(erro))} {...p} />
        <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? 'Esconder senha' : 'Mostrar senha'} aria-pressed={ver}
          className={clsx('absolute inset-y-0 right-0 grid w-13 place-items-center rounded-r-m transition-colors', ver ? 'text-roxo' : 'text-apagado')}>
          {ver ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      <ErroCampo id={id} erro={erro} />
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

/* Lista agrupada de navegação, com cabeçalho de seção (HIG "inset
   grouped", como nos Ajustes do celular). Cada linha: ícone em
   quadradinho colorido, título, linha de apoio e seta. */
export type ItemNav = { icone?: LucideIcon; titulo: ReactNode; sub?: ReactNode; onClick: () => void; direita?: ReactNode };
export function GrupoNav({ titulo, itens, className }: { titulo?: string; itens: ItemNav[]; className?: string }) {
  return (
    <section className={clsx('mb-5', className)}>
      {titulo && <h2 className="mx-4 mb-1.5 text-[13px] font-semibold tracking-wide text-apagado uppercase">{titulo}</h2>}
      <ul className={clsx(CARTAO, 'overflow-hidden', itens.some((i) => i.icone) ? '[--fio:60px]' : '[--fio:16px]')}>
        {itens.map((i, k) => (
          <li key={k} className={clsx('relative',
            'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-(--fio)',
            'not-first:before:h-px not-first:before:bg-borda not-first:before:content-[""]')}>
            <button type="button" onClick={i.onClick}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 ease-curva active:bg-roxo-fraco/60">
              {i.icone && (
                <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-roxo text-white"><i.icone size={18} /></span>
              )}
              <span className="min-w-0 flex-1 text-base leading-tight font-semibold">
                {i.titulo}
                {i.sub && <small className="mt-0.5 block text-[13px] font-normal text-apagado">{i.sub}</small>}
              </span>
              {i.direita ?? <Seta />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
