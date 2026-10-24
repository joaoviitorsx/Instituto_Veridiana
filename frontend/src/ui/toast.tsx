/* Aviso curto no rodapé ("snackbar" do Material 3).
   toast('Salvo'), toast('Não deu', 'erro', {rotulo, fn}), toast('Sem rede', 'info').
   Função solta, não hook: a fila de envio também avisa.

   - Uma superfície só, escura; o tipo vem do ícone colorido, não de pintar
     o fundo inteiro (vermelho chapado assusta e esconde o texto).
   - Ação é botão de texto, à direita, com alvo de 44px.
   - Arrastar para o lado ou para baixo fecha. Dedo em cima pausa o tempo.
   - Erro é anunciado na hora pelo leitor de tela (assertive). */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Check, CircleAlert, Info } from 'lucide-react';
import { clsx } from 'clsx';

type Tipo = 'ok' | 'erro' | 'info';
type Acao = { rotulo: string; fn: () => void };
type Estado = { aberto: boolean; texto: string; tipo: Tipo; acao?: Acao; id: number };

let estado: Estado = { aberto: false, texto: '', tipo: 'ok', id: 0 };
const ouvintes = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
function mudar(e: Estado) { estado = e; ouvintes.forEach((f) => f()); }

/* Com ação, mais tempo: dá para ler e decidir. Erro também. */
function prazo(e: Estado) { return e.acao ? 6500 : e.tipo === 'erro' ? 5000 : 3200; }
function agendar() { clearTimeout(timer); timer = setTimeout(fecharToast, prazo(estado)); }

export function toast(texto: string, tipo: Tipo = 'ok', acao?: Acao) {
  mudar({ aberto: true, texto, tipo, acao, id: estado.id + 1 });
  agendar();
}
export function fecharToast() {
  clearTimeout(timer);
  if (estado.aberto) mudar({ ...estado, aberto: false });
}

const ICONE: Record<Tipo, { Ic: typeof Check; cor: string }> = {
  ok: { Ic: Check, cor: 'bg-presente' },
  erro: { Ic: CircleAlert, cor: 'bg-falta' },
  info: { Ic: Info, cor: 'bg-roxo' },
};

export function Toaster() {
  const e = useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => estado);
  const [arrasto, setArrasto] = useState<{ x: number; y: number } | null>(null);
  const inicio = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { setArrasto(null); }, [e.id]);

  const { Ic, cor } = ICONE[e.tipo];
  const longe = !!arrasto && (Math.abs(arrasto.x) > 80 || arrasto.y > 40);

  return (
    <div
      role={e.tipo === 'erro' ? 'alert' : 'status'}
      aria-live={e.tipo === 'erro' ? 'assertive' : 'polite'}
      data-sem-arrasto
      onPointerDown={(ev) => { inicio.current = { x: ev.clientX, y: ev.clientY }; clearTimeout(timer); }}
      onPointerMove={(ev) => {
        if (!inicio.current) return;
        setArrasto({ x: ev.clientX - inicio.current.x, y: Math.max(0, ev.clientY - inicio.current.y) });
      }}
      onPointerUp={() => {
        inicio.current = null;
        if (longe) fecharToast(); else { setArrasto(null); if (estado.aberto) agendar(); }
      }}
      onPointerCancel={() => { inicio.current = null; setArrasto(null); if (estado.aberto) agendar(); }}
      style={arrasto ? { transform: `translate(${arrasto.x}px, ${arrasto.y}px)`, opacity: Math.max(.2, 1 - Math.abs(arrasto.x) / 240), transition: 'none' } : undefined}
      className={clsx(
        'fixed inset-x-3 z-60 mx-auto flex max-w-[560px] touch-none items-center gap-3 rounded-2xl bg-tinta py-2.5 pr-2 pl-3 text-white select-none',
        'shadow-[0_10px_30px_rgba(27,16,32,.35),0_2px_6px_rgba(27,16,32,.2)]',
        'transition-[translate,scale,opacity] duration-300 ease-curva',
        'bottom-[calc(12px+max(var(--barra-h),env(safe-area-inset-bottom))+var(--fab-h))]',
        e.aberto ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-6 scale-95 opacity-0',
      )}
    >
      <span className={clsx('grid size-8 shrink-0 place-items-center rounded-full text-white', cor)}>
        <Ic size={18} strokeWidth={2.5} />
      </span>
      <span className="min-w-0 flex-1 py-1 text-[15px] leading-snug font-medium">{e.texto}</span>
      {e.acao ? (
        <button
          type="button"
          onPointerDown={(ev) => ev.stopPropagation()}
          onClick={() => { const f = e.acao!.fn; fecharToast(); f(); }}
          className="min-h-11 shrink-0 rounded-xl px-3 text-[15px] font-bold text-roxo-claro active:bg-white/10"
        >
          {e.acao.rotulo}
        </button>
      ) : <span className="w-1" />}
    </div>
  );
}
