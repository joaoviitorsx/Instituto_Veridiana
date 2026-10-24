/* Convite para instalar o app, ao abrir pelo navegador (DESIGN.md §8).

   Android/Chrome: "Instalar" abre o diálogo do sistema, e o ícone vai
   para a tela inicial — um toque e pronto.
   iPhone: a Apple não deixa instalar por código. A folha mostra os
   passos do Safari (Compartilhar → Adicionar à Tela de Início).

   Não aparece: dentro do app já instalado, no meio de uma chamada, nem
   por 7 dias depois de "Agora não". */
import { useEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { CloudOff, Share, SquarePlus, Zap, Smartphone } from 'lucide-react';
import { folha, Acoes } from './folha';
import { toast } from './toast';
import { useInstalacao, instalar, rodandoInstalado } from '../offline/instalar';

const CHAVE = 'veridiana.convite-instalar';
const ESPERA_DIAS = 7;

function recusouHaPouco(): boolean {
  try {
    const t = Number(localStorage.getItem(CHAVE) || 0);
    return Date.now() - t < ESPERA_DIAS * 86400000;
  } catch { return false; }
}
function guardarRecusa() {
  try { localStorage.setItem(CHAVE, String(Date.now())); } catch { /* sem guardar: pergunta de novo */ }
}

/* Telas em que um convite atrapalharia: a lista de chamada (marcando
   presença), o fim da chamada e as pendências. */
function rotaTranquila(p: string) {
  return !/^\/chamada\/.+/.test(p) && p !== '/salva' && p !== '/pendentes';
}

export function ConviteInstalar() {
  const situacao = useInstalacao();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mostrou = useRef(false);

  useEffect(() => {
    if (mostrou.current || rodandoInstalado() || recusouHaPouco()) return;
    if (situacao !== 'android' && situacao !== 'iphone') return;
    if (!rotaTranquila(pathname)) return;
    /* Um instante depois de a tela pintar: convite que pula na cara
       antes de a página aparecer parece propaganda. */
    const t = setTimeout(() => {
      if (folha.aberta() || mostrou.current) return;
      mostrou.current = true;
      if (situacao === 'android') abrirAndroid();
      else abrirIphone();
    }, 1200);
    return () => clearTimeout(t);
  }, [situacao, pathname]);

  return null;
}

function Cabeca({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 px-2">
      <img src="/icones/icon-192.png" alt="" width={56} height={56} className="size-14 shrink-0 rounded-2xl shadow-cartao" />
      <div className="min-w-0">
        <b className="block text-[17px] leading-tight">{titulo}</b>
        <span className="block text-sm text-apagado">{texto}</span>
      </div>
    </div>
  );
}

function Vantagem({ icone: Ic, children }: { icone: typeof Zap; children: string }) {
  return (
    <li className="flex items-center gap-3 py-1.5 text-[15px]">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-roxo-fraco text-roxo"><Ic size={18} /></span>
      {children}
    </li>
  );
}

function abrirAndroid() {
  folha.abrir('Instalar o app', (fechar) => (
    <>
      <Cabeca titulo="Veridiana na tela inicial" texto="Grátis, ocupa quase nada de espaço." />
      <ul className="mb-2 px-2">
        <Vantagem icone={Smartphone}>Abre pelo ícone, em tela cheia</Vantagem>
        <Vantagem icone={CloudOff}>Faz a chamada mesmo sem internet</Vantagem>
        <Vantagem icone={Zap}>Abre na hora, sem esperar o navegador</Vantagem>
      </ul>
      <Acoes rotulo="Instalar" perigo={false} rotuloCancelar="Agora não"
        onCancelar={() => { guardarRecusa(); fechar(); }}
        onConfirmar={async () => {
          fechar();
          const ok = await instalar();
          if (ok) toast('Pronto! O ícone do Veridiana está na tela inicial.');
          else guardarRecusa();
        }} />
    </>
  ), { aoFechar: guardarRecusa });
}

function abrirIphone() {
  folha.abrir('Instalar no iPhone', (fechar) => (
    <>
      <Cabeca titulo="Veridiana na tela de início" texto="São três toques, uma vez só." />
      <ol className="mb-2 space-y-3 px-2">
        <Passo n={1}>Toque em <b className="inline-flex items-center gap-1 text-roxo">Compartilhar <Share size={16} /></b> na barra do Safari (embaixo ou no topo).</Passo>
        <Passo n={2}>Role a lista e toque em <b className="inline-flex items-center gap-1 text-roxo">Adicionar à Tela de Início <SquarePlus size={16} /></b>.</Passo>
        <Passo n={3}>Toque em <b className="text-roxo">Adicionar</b>. Depois, abra o app pelo ícone e entre com seu e-mail e senha.</Passo>
      </ol>
      <div className="px-2 pt-3">
        <button type="button" onClick={() => { guardarRecusa(); fechar(); }}
          className="min-h-13 w-full rounded-m bg-roxo text-base font-bold text-white active:bg-roxo-fundo">Entendi</button>
      </div>
    </>
  ), { aoFechar: guardarRecusa });
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[15px] leading-snug">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-roxo text-sm font-bold text-white">{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  );
}
