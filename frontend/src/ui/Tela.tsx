/* A moldura de toda tela. Padrões e fontes em DESIGN.md.

   - Barra de topo clara que ganha fio ao rolar; título grande nas telas
     raiz, que encolhe para a barra ao rolar (HIG large title, M3 small
     app bar on scroll). O Início é a exceção: capa roxa de marca.
   - Barra de abas no rodapé, só nas 5 telas raiz (HIG Tab bars, M3
     Navigation bar).
   - Ação da tela: barra fixa no rodapé (tarefa) ou FAB estendido acima
     das abas (criar algo numa tela raiz).

   Mobile-first. No desktop é o mesmo layout, com largura máxima
   centralizada — não uma interface separada. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { ChevronLeft, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { Logo } from './Logo';
import { Abas, ehRaiz } from './Abas';
import { registrarVoltar } from './Arrastar';

const COR_ROXO = '#4A1D6E';
const COR_CLARO = '#F4F1F7';

type Props = {
  titulo?: string;
  /* Capa no topo (Início, chamada com placar). Sem capa, o título vai na
     barra — ou grande no conteúdo, nas telas raiz. */
  capa?: ReactNode;
  /* Título grande no começo do conteúdo. Padrão: sim nas telas raiz. */
  grande?: boolean;
  /* Texto menor embaixo do título grande. */
  sub?: ReactNode;
  /* Cabeçalho roxo de marca (só o Início usa). */
  roxo?: boolean;
  /* Número à direita no cabeçalho, quando a capa já rolou (placar da chamada). */
  placar?: ReactNode;
  /* Botões à direita na barra de topo (ícones com aria-label). */
  acoes?: ReactNode;
  /* false esconde o voltar. String: para onde ir quando não há de onde
     voltar (app aberto direto nesta tela, por link ou QR). Nas telas raiz
     não há voltar: as abas são a navegação. */
  voltar?: false | string;
  barra?: ReactNode;
  /* Botão flutuante de criar: ícone + texto, nunca só ícone. */
  fab?: { icone: LucideIcon; texto: string; onClick: () => void };
  /* Sem a coluna centralizada com respiro: a tela cuida do layout. */
  solto?: boolean;
  children?: ReactNode;
};

export function useVoltar(padrao = '/') {
  const router = useRouter();
  const navigate = useNavigate();
  return () => {
    if (router.history.canGoBack()) router.history.back();
    else navigate({ to: padrao, replace: true });
  };
}

export function Tela({ titulo, capa, grande, sub, roxo, placar, acoes, voltar = '/', barra, fab, solto, children }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const raiz = ehRaiz(pathname);
  const comVoltar = voltar !== false && !raiz;
  const tituloGrande = grande ?? (raiz && !capa);
  const fazerVoltar = useVoltar(typeof voltar === 'string' ? voltar : '/');
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    /* Título pequeno aparece quando o grande (ou a capa) sai de vista. */
    const limite = capa || tituloGrande ? 44 : 4;
    const f = () => setRolou(window.scrollY > limite);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, [capa, tituloGrande]);

  useEffect(() => { document.title = titulo ? titulo + ' — Veridiana' : 'Chamada — Instituto Veridiana'; }, [titulo]);
  /* O gesto de voltar pela borda faz o mesmo que o botão; sem botão
     (tela raiz, chamada aberta pelo QR), sem gesto. */
  const voltarRef = useRef(fazerVoltar);
  voltarRef.current = fazerVoltar;
  useEffect(() => {
    registrarVoltar(comVoltar ? () => voltarRef.current() : null);
    return () => registrarVoltar(null);
  }, [comVoltar]);
  /* Barra de status do Android da mesma cor do topo, sem emenda. */
  useEffect(() => { corDoSistema(roxo ? COR_ROXO : COR_CLARO); }, [roxo]);

  const compacto = rolou || (!capa && !tituloGrande);

  return (
    <>
      <header
        className={clsx('sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-[box-shadow,background-color] duration-200 ease-curva',
          roxo ? 'sobre-roxo bg-roxo text-white' : 'bg-fundo/88 text-tinta backdrop-blur-md backdrop-saturate-150',
          rolou && (roxo ? 'shadow-[0_6px_16px_rgba(27,16,32,.16)]' : 'shadow-[0_1px_0_var(--color-borda)]'))}
      >
        <div className={clsx('mx-auto flex h-14 max-w-[644px] items-center gap-1 pr-2', comVoltar ? 'pl-1' : 'pl-4')}>
          {comVoltar && (
            <button type="button" aria-label="Voltar" onClick={fazerVoltar}
              className={clsx('grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-150',
                roxo ? 'active:bg-white/15' : 'text-roxo active:bg-roxo-fraco')}>
              <ChevronLeft size={26} strokeWidth={2.25} />
            </button>
          )}
          <div className="relative min-w-0 flex-1">
            {roxo && (
              <div className={clsx('pointer-events-none absolute top-1/2 -translate-y-1/2 text-xs font-bold tracking-[.09em]',
                'whitespace-nowrap text-roxo-claro transition-opacity duration-200', compacto ? 'opacity-0' : 'opacity-100')}>
                INSTITUTO VERIDIANA
              </div>
            )}
            <div className={clsx('truncate text-[17px] font-bold tracking-tight transition-opacity duration-200',
              compacto ? 'opacity-100' : 'opacity-0')} aria-hidden={!compacto}>
              {titulo}
            </div>
          </div>
          {placar !== undefined && (
            <div className={clsx('shrink-0 pr-2 text-right text-[17px] font-bold text-roxo tabular-nums transition-opacity duration-200',
              rolou ? 'opacity-100' : 'opacity-0', roxo && 'text-white')}>
              {placar}
            </div>
          )}
          {acoes}
        </div>
      </header>

      {capa && <div data-conteudo>{capa}</div>}

      <main data-conteudo className={clsx(raiz ? 'pb-[calc(32px+var(--barra-h)+var(--fab-h))]' : 'pb-[calc(24px+var(--barra-h))]')}>
        {solto ? children : (
          <div className={clsx('mx-auto max-w-[620px] px-4', tituloGrande ? 'pt-1' : 'pt-4')}>
            {tituloGrande && titulo && (
              <div className="mb-4">
                <h1 className="text-[28px] leading-tight font-extrabold tracking-tight hyphens-auto [overflow-wrap:anywhere] baixo:text-[22px]">
                  {titulo}
                </h1>
                {sub && <p className="mt-1 text-[15px] text-apagado">{sub}</p>}
              </div>
            )}
            {children}
          </div>
        )}
      </main>

      {fab && <Fab {...fab} />}
      <Rodape barra={barra} abas={raiz} />
    </>
  );
}

export function corDoSistema(cor: string) {
  let m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
  if (m.content !== cor) m.content = cor;
}

/* Capa. Clara por padrão (título grande + placar à direita); roxa no Início. */
export function Capa({ titulo, sub, direita, logo, roxo }: {
  titulo: ReactNode; sub?: ReactNode; direita?: ReactNode; logo?: boolean; roxo?: boolean;
}) {
  return (
    <div className={clsx(roxo ? 'bg-roxo pt-1 pb-6 text-white' : 'pt-1 pb-2', 'px-5 baixo:pb-2')}>
      <div className={clsx('mx-auto flex max-w-[620px] gap-4', logo ? 'items-center' : 'items-end')}>
        {logo && (
          <span className="size-13 shrink-0 rounded-2xl bg-white p-[3px] text-roxo [&_.logo]:size-full">
            <Logo />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className={clsx('leading-tight font-extrabold tracking-tight hyphens-auto [overflow-wrap:anywhere] baixo:text-xl',
            roxo ? 'text-2xl' : 'text-[28px]')}>{titulo}</h1>
          {sub && <p className={clsx('mt-1 text-sm baixo:hidden', roxo ? 'text-roxo-claro' : 'text-[15px] text-apagado')}>{sub}</p>}
        </div>
        {direita && <div className={clsx('shrink-0 text-right leading-none', !roxo && 'text-roxo')}>{direita}</div>}
      </div>
    </div>
  );
}

/* FAB estendido (M3): uma ação positiva por tela, acima das abas, à direita. */
function Fab({ icone: Ic, texto, onClick }: { icone: LucideIcon; texto: string; onClick: () => void }) {
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--fab-h', '72px');
    return () => { document.documentElement.style.setProperty('--fab-h', '0px'); };
  }, []);
  return (
    <button type="button" onClick={onClick}
      className={clsx('fixed right-4 z-26 flex h-14 items-center gap-2 rounded-2xl bg-roxo pr-5 pl-4 text-base font-bold text-white',
        'shadow-[0_6px_16px_rgba(74,29,110,.32),0_2px_4px_rgba(27,16,32,.12)] transition-[background-color,box-shadow] duration-150',
        'bottom-[calc(16px+var(--barra-h))] active:bg-roxo-fundo active:shadow-[0_2px_6px_rgba(74,29,110,.3)]',
        'min-[668px]:right-[calc(50%-306px)]')}>
      <Ic size={22} strokeWidth={2.25} /> {texto}
    </button>
  );
}

/* Rodapé fixo: barra de ação (se houver) em cima das abas (se for tela
   raiz). Mede a própria altura: conteúdo, FAB e toast sobem por ela. */
function Rodape({ barra, abas }: { barra?: ReactNode; abas: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const raizDoc = document.documentElement;
    if (!el) { raizDoc.style.setProperty('--barra-h', '0px'); return; }
    const medir = () => raizDoc.style.setProperty('--barra-h', el.offsetHeight + 'px');
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => { ro.disconnect(); raizDoc.style.setProperty('--barra-h', '0px'); };
  }, [barra !== undefined && barra !== false && barra !== null, abas]);
  if (!barra && !abas) return null;
  return (
    <div ref={ref} className="fixed inset-x-0 bottom-0 z-25 [view-transition-name:rodape]">
      {barra && (
        <div className={clsx('border-t border-borda bg-fundo/95 px-4 pt-3 backdrop-blur-md',
          abas ? 'pb-3' : 'pb-[calc(12px+env(safe-area-inset-bottom))] baixo:pt-2 baixo:pb-[calc(8px+env(safe-area-inset-bottom))]')}>
          <div className="mx-auto max-w-[620px]">{barra}</div>
        </div>
      )}
      {abas && <Abas />}
    </div>
  );
}
