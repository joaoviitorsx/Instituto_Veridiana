/* Instalar na tela inicial.
   Android: o Chrome oferece o evento beforeinstallprompt; guardamos e um
   botão discreto na tela inicial dispara quando a pessoa quiser — nunca
   pop-up no primeiro acesso.
   iPhone: não existe prompt. No Safari, fora do modo instalado, a tela
   mostra o caminho: Compartilhar → Adicionar à Tela de Início. */
import { useSyncExternalStore } from 'react';

type PromptEvento = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

let evento: PromptEvento | null = null;
let instalado = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export function rodandoInstalado(): boolean {
  return instalado ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function ehIphone(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/* Chamado no main.tsx, antes de tudo: o evento pode chegar cedo. */
export function ouvirInstalacao() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    evento = e as PromptEvento;
    avisar();
  });
  window.addEventListener('appinstalled', () => { instalado = true; evento = null; avisar(); });
}

/* Abre o diálogo de instalação do sistema. true se a pessoa aceitou. */
export async function instalar(): Promise<boolean> {
  if (!evento) return false;
  const e = evento;
  evento = null;
  avisar();
  await e.prompt();
  const r = await e.userChoice.catch(() => ({ outcome: '' }));
  if (r.outcome === 'accepted') { instalado = true; avisar(); return true; }
  return false;
}

type Situacao = 'instalado' | 'android' | 'iphone' | 'nada';
function situacao(): Situacao {
  if (rodandoInstalado()) return 'instalado';
  if (evento) return 'android';
  if (ehIphone()) return 'iphone';
  return 'nada';
}
let ultima: Situacao = 'nada';
export function useInstalacao(): Situacao {
  return useSyncExternalStore(
    (f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; },
    () => (ultima = situacao(), ultima),
  );
}
