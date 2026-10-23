/* "Nova versão disponível — tocar para atualizar". Nunca recarrega
   sozinho: no meio de uma chamada, recarregar apaga as marcações. */
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export function AvisoAtualizacao() {
  const { needRefresh: [precisa], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      /* App que fica aberto o dia todo também descobre a versão nova. */
      if (reg) setInterval(() => { reg.update().catch(() => {}); }, 60 * 60 * 1000);
    },
  });
  if (!precisa) return null;
  return (
    <button
      type="button"
      onClick={() => updateServiceWorker(true)}
      className="fixed inset-x-0 top-[env(safe-area-inset-top)] z-70 mx-auto flex max-w-[620px] items-center justify-center gap-2 bg-tinta px-4 py-2 text-sm font-semibold text-white"
    >
      <RefreshCw size={16} /> Nova versão disponível — tocar para atualizar
    </button>
  );
}
