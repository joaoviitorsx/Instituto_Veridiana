/* Barra de abas: a navegação principal, sempre visível nas telas raiz.

   5 destinos (HIG Tab bars; M3 Navigation bar: 3 a 5). Rótulo SEMPRE
   visível em todas, inclusive nas inativas: ícone sozinho não se explica
   para quem não é de tecnologia. Aba ativa: ícone numa pílula de 56×32
   (indicador do M3), roxo, rótulo em negrito. Tocar na aba em que já
   está volta ao topo. */
import { Link, useRouterState } from '@tanstack/react-router';
import { Calendar, ClipboardList, House, Settings, Wallet, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

export const ABAS: { to: '/' | '/chamada' | '/agenda' | '/caixa' | '/gestao'; txt: string; ic: LucideIcon }[] = [
  { to: '/', txt: 'Início', ic: House },
  { to: '/chamada', txt: 'Chamada', ic: ClipboardList },
  { to: '/agenda', txt: 'Agenda', ic: Calendar },
  { to: '/caixa', txt: 'Caixa', ic: Wallet },
  { to: '/gestao', txt: 'Gestão', ic: Settings },
];

const RAIZES = new Set<string>(ABAS.map((a) => a.to));
export function ehRaiz(pathname: string): boolean {
  return RAIZES.has(pathname.replace(/\/+$/, '') || '/');
}

export function Abas() {
  const atual = useRouterState({ select: (s) => s.location.pathname.replace(/\/+$/, '') || '/' });
  return (
    <nav aria-label="Seções do app"
      className="border-t border-borda bg-papel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="mx-auto flex h-16 max-w-[644px] items-stretch">
        {ABAS.map((a) => {
          const ativa = atual === a.to;
          return (
            <li key={a.to} className="flex-1">
              <Link
                to={a.to}
                replace={ativa}
                aria-current={ativa ? 'page' : undefined}
                onClick={(e) => {
                  if (ativa) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
                }}
                className="group flex h-full min-h-12 flex-col items-center justify-center gap-1 text-xs"
              >
                <span className={clsx('grid h-8 w-14 place-items-center rounded-full transition-colors duration-200 ease-curva',
                  ativa ? 'bg-roxo-fraco text-roxo' : 'text-apagado group-active:bg-fundo')}>
                  <a.ic size={22} strokeWidth={ativa ? 2.4 : 2} />
                </span>
                <span className={clsx('leading-none', ativa ? 'font-bold text-roxo' : 'font-medium text-apagado')}>{a.txt}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
