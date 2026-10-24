/* Gestos de arrastar para o lado, como em app nativo.

   1. Voltar pela borda: arrastar da borda esquerda (24px) nas telas
      internas. Uma seta acompanha o dedo ("voltar preditivo" do Android
      13+); passou do ponto, vibra; soltar volta. Faz exatamente o que o
      botão de voltar da tela faz (Tela registra aqui) — sem botão, sem gesto.
      No Safari do iPhone (fora do app instalado) fica desligado: o próprio
      Safari já volta pela borda, e seriam dois voltares.
   2. Trocar de aba: arrastar para o lado nas 5 telas raiz. A tela segue
      o dedo um pouco; soltando depois do ponto, a aba vizinha entra
      deslizando do lado certo.

   Gesto nunca é o único caminho (HIG Accessibility): abas e voltar
   continuam na tela. E não briga com o resto: só vale movimento
   claramente horizontal, e não começa em campo de texto, folha aberta,
   toast, nem em nada que já role para o lado (chips de filtro). */
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { ABAS, ehRaiz } from './Abas';
import { folha } from './folha';
import { ehIphone, rodandoInstalado } from '../offline/instalar';
import { vibrar } from '../util';

let voltarAtual: (() => void) | null = null;
export function registrarVoltar(f: (() => void) | null) { voltarAtual = f; }

const BORDA = 24;          // px a partir da borda esquerda que contam como "borda"
const TRAVA = 10;          // px até decidir se o gesto é horizontal ou vertical
const LIMIAR_VOLTAR = 72;  // px para soltar e voltar
const LIMIAR_ABA = 70;     // px para soltar e trocar de aba
const RAPIDO = 0.45;       // px/ms: um peteleco rápido também vale

function gestoDeVoltarLigado() {
  return !(ehIphone() && !rodandoInstalado());
}

/* Rola para o lado por conta própria? Então o arrasto é dela. */
function rolaDeLado(alvo: Element | null): boolean {
  for (let e = alvo; e && e !== document.body; e = e.parentElement) {
    const ox = getComputedStyle(e).overflowX;
    if ((ox === 'auto' || ox === 'scroll') && e.scrollWidth > e.clientWidth + 2) return true;
  }
  return false;
}
function podeComecar(alvo: Element | null): boolean {
  if (!alvo || folha.aberta()) return false;
  if (alvo.closest('input, textarea, select, [contenteditable="true"], [data-sem-arrasto], [role="dialog"]')) return false;
  return !rolaDeLado(alvo);
}

export function Arrastar() {
  const navigate = useNavigate();
  const [seta, setSeta] = useState<{ y: number; dx: number; pronto: boolean } | null>(null);

  useEffect(() => {
    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let modo: null | 'voltar' | 'aba' | 'nada' = 'nada';
    let candidato: 'voltar' | 'aba' | null = null;
    let x0 = 0, y0 = 0, t0 = 0, dx = 0, vibrou = false;
    /* Capa e corpo andam juntos; cabeçalho e abas ficam parados. */
    const conteudo = () => [...document.querySelectorAll<HTMLElement>('[data-conteudo]')];

    function abaVizinha(lado: 1 | -1) {
      const atual = location.pathname.replace(/\/+$/, '') || '/';
      const i = ABAS.findIndex((a) => a.to === atual);
      return i < 0 ? null : ABAS[i + lado] || null;
    }
    function soltarConteudo(animar: boolean) {
      for (const m of conteudo()) {
        m.style.transition = animar ? 'transform 220ms cubic-bezier(.32,.72,0,1), opacity 220ms' : '';
        m.style.transform = '';
        m.style.opacity = '';
      }
    }

    function inicio(e: TouchEvent) {
      modo = 'nada'; candidato = null; setSeta(null);
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      x0 = t.clientX; y0 = t.clientY; t0 = e.timeStamp; dx = 0; vibrou = false;
      const alvo = e.target as Element | null;
      if (!podeComecar(alvo)) return;
      if (x0 <= BORDA && voltarAtual && gestoDeVoltarLigado()) candidato = 'voltar';
      else if (ehRaiz(location.pathname)) candidato = 'aba';
      if (candidato) modo = null;
    }

    function move(e: TouchEvent) {
      if (modo === 'nada' || !candidato) return;
      const t = e.touches[0];
      dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (modo === null) {
        if (Math.abs(dx) < TRAVA && Math.abs(dy) < TRAVA) return;
        modo = Math.abs(dx) > Math.abs(dy) * 1.4 ? candidato : 'nada';
        if (modo === 'nada') return;
      }
      /* Gesto horizontal decidido: a página não rola junto. */
      if (e.cancelable) e.preventDefault();
      if (modo === 'voltar') {
        const d = Math.max(0, dx);
        const pronto = d > LIMIAR_VOLTAR;
        if (pronto && !vibrou) { vibrar(); vibrou = true; }
        if (!pronto) vibrou = false;
        setSeta({ y: t.clientY, dx: d, pronto });
      } else if (modo === 'aba' && !semMovimento) {
        const temVizinha = !!abaVizinha(dx < 0 ? 1 : -1);
        /* Na primeira e na última aba, resiste: não há para onde ir. */
        const desloc = temVizinha ? Math.max(-64, Math.min(64, dx * 0.4)) : Math.max(-16, Math.min(16, dx * 0.12));
        for (const m of conteudo()) {
          m.style.transition = 'none';
          m.style.transform = `translateX(${desloc}px)`;
          m.style.opacity = String(1 - Math.min(0.35, Math.abs(desloc) / 180));
        }
      }
    }

    function fim(e: TouchEvent) {
      const quem = modo;
      modo = 'nada';
      if (quem !== 'voltar' && quem !== 'aba') return;
      const vel = Math.abs(dx) / Math.max(1, e.timeStamp - t0);
      if (quem === 'voltar') {
        setSeta(null);
        if ((dx > LIMIAR_VOLTAR || (vel > RAPIDO && dx > 30)) && voltarAtual) voltarAtual();
        return;
      }
      const lado: 1 | -1 = dx < 0 ? 1 : -1;
      const alvo = abaVizinha(lado);
      if (alvo && (Math.abs(dx) > LIMIAR_ABA || (vel > RAPIDO && Math.abs(dx) > 30))) {
        vibrar();
        /* A tela velha sai do ponto em que o dedo deixou; a nova entra
           deslizando do lado de onde veio o arrasto. */
        navigate({ to: alvo.to, viewTransition: { types: [lado === 1 ? 'ir' : 'voltar'] } })
          .finally(() => soltarConteudo(false));
      } else {
        soltarConteudo(true);
      }
    }
    function cancela() {
      if (modo === 'aba') soltarConteudo(true);
      modo = 'nada'; setSeta(null);
    }

    document.addEventListener('touchstart', inicio, { passive: true });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', fim, { passive: true });
    document.addEventListener('touchcancel', cancela, { passive: true });
    return () => {
      document.removeEventListener('touchstart', inicio);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', fim);
      document.removeEventListener('touchcancel', cancela);
    };
  }, [navigate]);

  if (!seta) return null;
  const desloc = Math.min(seta.dx, LIMIAR_VOLTAR + 20) * 0.7;
  return (
    <div aria-hidden="true"
      className={clsx('pointer-events-none fixed left-0 z-70 grid size-12 place-items-center rounded-full shadow-[0_6px_20px_rgba(27,16,32,.25)]',
        'transition-[background-color,color,scale] duration-150',
        seta.pronto ? 'scale-105 bg-roxo text-white' : 'bg-papel text-roxo')}
      style={{ top: seta.y - 24, transform: `translateX(${desloc - 40}px)`, opacity: Math.min(1, seta.dx / 30) }}>
      <ChevronLeft size={26} strokeWidth={2.5} />
    </div>
  );
}
