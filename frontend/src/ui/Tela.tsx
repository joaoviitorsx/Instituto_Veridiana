/* A moldura de toda tela: cabeçalho roxo fixo, capa roxa que rola,
   corpo centralizado e a barra de ação no rodapé.

   Mobile-first. No desktop é o mesmo layout, com largura máxima
   centralizada — não uma interface separada. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronLeft, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { Logo } from './Logo';

type Props = {
  titulo?: string;
  /* Capa roxa no topo. Sem capa, o título já nasce no cabeçalho. */
  capa?: ReactNode;
  /* Número à direita no cabeçalho, quando a capa já rolou (placar da chamada). */
  placar?: ReactNode;
  /* false esconde o voltar. String: para onde ir quando não há de onde
     voltar (app aberto direto nesta tela, por link ou QR). */
  voltar?: false | string;
  gestao?: boolean;
  barra?: ReactNode;
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

export function Tela({ titulo, capa, placar, voltar = '/', gestao, barra, solto, children }: Props) {
  const navigate = useNavigate();
  const fazerVoltar = useVoltar(typeof voltar === 'string' ? voltar : '/');
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const f = () => setRolou(window.scrollY > 32);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  useEffect(() => { document.title = titulo ? titulo + ' — Veridiana' : 'Chamada — Instituto Veridiana'; }, [titulo]);

  const compacto = rolou || !capa;

  return (
    <>
      <header
        className={clsx('sobre-roxo sticky top-0 z-30 bg-roxo pt-[env(safe-area-inset-top)] text-white',
          'transition-shadow duration-200 ease-curva',
          rolou && 'shadow-[0_1px_0_rgba(0,0,0,.14),0_6px_16px_rgba(27,16,32,.16)]')}
      >
        <div className="mx-auto flex h-14 max-w-[644px] items-center gap-3 pr-2 pl-1">
          {voltar !== false ? (
            <button type="button" aria-label="Voltar" onClick={fazerVoltar}
              className="grid size-11 shrink-0 place-items-center rounded-p active:bg-white/15">
              <ChevronLeft size={24} />
            </button>
          ) : <span className="w-3" />}
          <div className="relative min-w-0 flex-1">
            <div className={clsx('pointer-events-none absolute top-1/2 -translate-y-1/2 text-xs font-bold tracking-[.09em]',
              'whitespace-nowrap text-roxo-claro transition-opacity duration-200', compacto ? 'opacity-0' : 'opacity-100')}>
              INSTITUTO VERIDIANA
            </div>
            <div className={clsx('truncate text-[17px] font-semibold tracking-tight transition-opacity duration-200',
              compacto ? 'opacity-100' : 'opacity-0')}>
              {titulo}
            </div>
          </div>
          {placar !== undefined && (
            <div className={clsx('shrink-0 pr-3 text-right text-[17px] font-bold tabular-nums transition-opacity duration-200',
              rolou ? 'opacity-100' : 'opacity-0')}>
              {placar}
            </div>
          )}
          {gestao && (
            <button type="button" aria-label="Gestão" onClick={() => navigate({ to: '/gestao' })}
              className="grid size-11 shrink-0 place-items-center rounded-p active:bg-white/15">
              <Settings size={22} />
            </button>
          )}
        </div>
      </header>

      {capa}

      <main className="pb-[calc(24px+var(--barra-h))]">
        {solto ? children : <div className="mx-auto max-w-[620px] px-4 pt-5">{children}</div>}
      </main>

      {barra && <Barra>{barra}</Barra>}
    </>
  );
}

/* Capa roxa. titulo grande, sub em lilás, direita para o placar. */
export function Capa({ titulo, sub, direita, logo }: {
  titulo: ReactNode; sub?: ReactNode; direita?: ReactNode; logo?: boolean;
}) {
  return (
    <div className="bg-roxo px-5 pt-1 pb-6 text-white baixo:pb-3">
      <div className={clsx('mx-auto flex max-w-[620px] gap-4', logo ? 'items-center' : 'items-end')}>
        {logo && (
          <span className="size-13 shrink-0 rounded-2xl bg-white p-[3px] text-roxo [&_.logo]:size-full">
            <Logo />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl leading-tight font-bold tracking-tight hyphens-auto [overflow-wrap:anywhere] baixo:text-xl">{titulo}</h1>
          {sub && <p className="mt-1 text-sm text-roxo-claro baixo:hidden">{sub}</p>}
        </div>
        {direita && <div className="shrink-0 text-right leading-none">{direita}</div>}
      </div>
    </div>
  );
}

/* Barra fixa no rodapé. Mede a própria altura: o conteúdo e o toast
   sobem por ela (--barra-h). */
function Barra({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    const raiz = document.documentElement;
    const medir = () => raiz.style.setProperty('--barra-h', el.offsetHeight + 'px');
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => { ro.disconnect(); raiz.style.setProperty('--barra-h', '0px'); };
  }, []);
  return (
    <div ref={ref}
      className="fixed inset-x-0 bottom-0 z-25 border-t border-borda bg-fundo px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] baixo:pt-2 baixo:pb-[calc(8px+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[620px]">{children}</div>
    </div>
  );
}
