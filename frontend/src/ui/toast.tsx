/* Aviso curto no rodapé. toast('Salvo'), toast('Não deu', 'erro', {rotulo, fn}).
   Função solta, não hook: a fila de envio também avisa. */
import { useSyncExternalStore } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import { clsx } from 'clsx';

type Acao = { rotulo: string; fn: () => void };
type Estado = { aberto: boolean; texto: string; tipo: 'ok' | 'erro'; acao?: Acao; id: number };

let estado: Estado = { aberto: false, texto: '', tipo: 'ok', id: 0 };
const ouvintes = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
function mudar(e: Estado) { estado = e; ouvintes.forEach((f) => f()); }

export function toast(texto: string, tipo: 'ok' | 'erro' = 'ok', acao?: Acao) {
  mudar({ aberto: true, texto, tipo, acao, id: estado.id + 1 });
  clearTimeout(timer);
  timer = setTimeout(fecharToast, acao ? 6000 : 3600);
}
export function fecharToast() {
  if (estado.aberto) mudar({ ...estado, aberto: false });
}

export function Toaster() {
  const e = useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => estado);
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'fixed inset-x-4 z-60 mx-auto flex max-w-[560px] items-start gap-3 rounded-m px-4 py-3',
        'text-[15px] leading-snug font-medium text-white shadow-toast',
        'transition-[translate,opacity] duration-300 ease-curva',
        'bottom-[calc(16px+var(--barra-h)+env(safe-area-inset-bottom))]',
        e.tipo === 'erro' ? 'bg-[#7E1828]' : 'bg-tinta',
        e.aberto ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[150%] opacity-0',
      )}
    >
      <span className="mt-0.5 shrink-0">{e.tipo === 'erro' ? <CircleAlert size={20} /> : <Check size={20} />}</span>
      <span className="min-w-0 flex-1">{e.texto}</span>
      {e.acao && (
        <button
          type="button"
          className="-my-2 min-h-11 min-w-11 shrink-0 self-center px-2 text-[15px] font-bold underline"
          onClick={() => { const f = e.acao!.fn; fecharToast(); f(); }}
        >
          {e.acao.rotulo}
        </button>
      )}
    </div>
  );
}
