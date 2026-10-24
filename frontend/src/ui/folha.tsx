/* Folha que sobe de baixo (bottom sheet), reaproveitada por todo o app.

   folha.abrir(titulo, corpo)            conteúdo livre
   folha.opcoes(titulo, [{txt, fn}])     lista de escolhas
   folha.confirmar(titulo, texto, rotulo, fn)
   folha.pedirTexto(titulo, rotulo, valor, rotuloBotao, fn)
   folha.pedirFicha(titulo, campos, rotuloBotao, fn)

   Funções soltas, como no AppNucleo.html: qualquer tela chama sem hook.

   Como folha de app nativo (M3 modal bottom sheet, HIG Sheets):
   - o voltar do sistema fecha a folha, não a tela (entrada no histórico);
   - o fundo não rola e o foco fica dentro dela, voltando ao fechar;
   - Cancelar/Confirmar ficam sempre à vista, mesmo com o teclado aberto;
   - fecha arrastando pelo puxador, pelo corpo (no topo) ou com peteleco. */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { vibrar } from '../util';
import { fecharToast } from './toast';
import { Avatar, Campo } from './kit';

type Corpo = ReactNode | ((fechar: () => void) => ReactNode);
type Estado = { aberta: boolean; titulo: string; corpo: Corpo; aoFechar?: () => void; id: number };

let estado: Estado = { aberta: false, titulo: '', corpo: null, id: 0 };
const ouvintes = new Set<() => void>();
function mudar(e: Estado) { estado = e; ouvintes.forEach((f) => f()); }

export type Opcao = {
  txt: string; sub?: string; ini?: string; icone?: LucideIcon;
  marcado?: boolean; perigo?: boolean; fn?: () => void;
};
export type CampoFicha = {
  id: string; rotulo: string; valor?: string; tipo?: string; dica?: string; obrigatorio?: boolean;
};

/* ─── a folha no histórico ───
   Abrir empurra uma entrada com o mesmo endereço; o voltar do sistema
   (ou o gesto) tira essa entrada e fecha a folha. Fechar pelo app tira a
   entrada com history.back() — e tudo que viria depois (outra folha, ir
   para outra tela) espera esse voltar terminar, senão o voltar atrasado
   desfaria a navegação nova. */
let naPilha = false;        // a entrada da folha está no topo do histórico
let esperandoPop = false;   // pedimos history.back() e ele ainda não chegou
let fila: (() => void)[] = [];
let prazoPop: ReturnType<typeof setTimeout> | undefined;
function soltarFila() {
  esperandoPop = false; clearTimeout(prazoPop);
  const f = fila; fila = [];
  f.forEach((x) => x());
}
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (esperandoPop) { soltarFila(); return; }
    /* Voltar do sistema com a folha aberta: só fecha a folha. */
    if (naPilha) { naPilha = false; fecharSemHistorico(); }
  });
}
function tirarDaPilha() {
  if (!naPilha) return;
  naPilha = false;
  esperandoPop = true;
  prazoPop = setTimeout(soltarFila, 450);   // navegador que não avisa: segue mesmo assim
  history.back();
}
function fecharSemHistorico() {
  if (!estado.aberta) return;
  const f = estado.aoFechar;
  mudar({ ...estado, aberta: false, aoFechar: undefined });
  f?.();
}

/* Fecha antes e roda depois: a ação da opção pode abrir outra folha ou
   mudar de tela — só depois que a entrada da folha saiu do histórico. */
function depois(fn?: () => void) {
  if (!fn) return;
  if (esperandoPop) fila.push(() => setTimeout(fn, 30));
  else setTimeout(fn, 60);
}

export const folha = {
  abrir(titulo: string, corpo: Corpo, o: { aoFechar?: () => void } = {}) {
    if (esperandoPop) { fila.push(() => folha.abrir(titulo, corpo, o)); return; }
    fecharToast();
    if (!naPilha) {
      history.pushState({ ...(history.state || {}), folha: estado.id + 1 }, '', location.href);
      naPilha = true;
    }
    mudar({ aberta: true, titulo, corpo, aoFechar: o.aoFechar, id: estado.id + 1 });
  },
  fechar() {
    if (!estado.aberta) return;
    tirarDaPilha();
    fecharSemHistorico();
  },
  /* Para quem vai navegar logo depois de fechar (ex.: a rota mudou com a
     folha aberta): fecha sem mexer no histórico. */
  fecharSemVoltar() {
    naPilha = false;
    fecharSemHistorico();
  },
  aberta() { return estado.aberta; },
  /* Para quem fecha a folha e logo navega ou abre outra: espera a entrada
     da folha sair do histórico (senão o voltar atrasado desfaz a navegação). */
  depois(fn: () => void) { depois(fn); },

  opcoes(titulo: string, lista: Opcao[]) {
    folha.abrir(titulo, (fechar) => (
      <ul>
        {lista.map((o, i) => (
          <li key={i}>
            <button
              type="button"
              aria-selected={o.marcado === undefined ? undefined : o.marcado}
              onClick={() => { fechar(); depois(o.fn); }}
              className={clsx(
                'flex min-h-14 w-full items-center gap-3 rounded-p p-3 text-left text-base font-semibold',
                'transition-colors duration-150 ease-curva active:bg-fundo',
                o.perigo && 'text-falta',
              )}
            >
              {o.ini ? <Avatar nome={o.ini} pequeno /> : o.icone ? <o.icone size={20} /> : null}
              <span className="min-w-0">
                {o.txt}
                {o.sub && <small className="block text-[13px] font-normal text-apagado">{o.sub}</small>}
              </span>
              {o.marcado !== undefined && (
                <Check size={20} className={clsx('ml-auto shrink-0 text-roxo', !o.marcado && 'opacity-0')} />
              )}
            </button>
          </li>
        ))}
      </ul>
    ));
  },

  confirmar(titulo: string, texto: string, rotulo: string, fn: () => void, o: { perigo?: boolean } = {}) {
    folha.abrir(titulo, (fechar) => (
      <>
        <p className="mx-2 mb-3 text-sm text-apagado">{texto}</p>
        <Acoes
          rotulo={rotulo}
          perigo={o.perigo !== false}
          onCancelar={fechar}
          onConfirmar={() => { fechar(); depois(fn); }}
        />
      </>
    ));
  },

  pedirTexto(titulo: string, rotulo: string, valor: string, rotuloBotao: string, fn: (v: string) => void) {
    folha.pedirFicha(titulo, [{ id: 'v', rotulo, valor, obrigatorio: true }], rotuloBotao, (r) => fn(r.v));
  },

  pedirFicha(titulo: string, campos: CampoFicha[], rotuloBotao: string, fn: (r: Record<string, string>) => void) {
    folha.abrir(titulo, (fechar) => (
      <Ficha campos={campos} rotuloBotao={rotuloBotao} onCancelar={fechar}
        onEnviar={(r) => { fechar(); depois(() => fn(r)); }} />
    ));
  },
};

export function Acoes({ rotulo, onCancelar, onConfirmar, perigo = true, desligado, rotuloCancelar = 'Cancelar' }: {
  rotulo: string; onCancelar: () => void; onConfirmar: () => void; perigo?: boolean; desligado?: boolean; rotuloCancelar?: string;
}) {
  return (
    <div className="sticky bottom-0 z-1 -mx-3 flex shrink-0 gap-2 bg-papel px-5 pt-3 pb-1">
      <button type="button" onClick={onCancelar}
        className="min-h-13 flex-1 rounded-m bg-fundo text-base font-bold text-tinta active:bg-borda">
        {rotuloCancelar}
      </button>
      <button type="button" onClick={onConfirmar} disabled={desligado}
        className={clsx('min-h-13 flex-1 rounded-m text-base font-bold text-white disabled:bg-roxo-apagado',
          perigo ? 'bg-falta active:bg-falta-fundo' : 'bg-roxo active:bg-roxo-fundo')}>
        {rotulo}
      </button>
    </div>
  );
}

function Ficha({ campos, rotuloBotao, onCancelar, onEnviar }: {
  campos: CampoFicha[]; rotuloBotao: string; onCancelar: () => void; onEnviar: (r: Record<string, string>) => void;
}) {
  const [v, setV] = useState<Record<string, string>>(() =>
    Object.fromEntries(campos.map((c) => [c.id, c.valor || ''])));
  /* Erro embaixo do campo que faltou, não num toast atrás da folha. */
  const [erros, setErros] = useState<Record<string, string>>({});
  const primeiro = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => { primeiro.current?.focus(); primeiro.current?.select(); }, 320);
    return () => clearTimeout(t);
  }, []);
  function enviar() {
    const r: Record<string, string> = {}, e: Record<string, string> = {};
    for (const c of campos) {
      const x = (v[c.id] || '').trim();
      if (c.obrigatorio && x.length < 2) e[c.id] = x ? 'Escreva pelo menos 2 letras.' : 'Preencha ' + c.rotulo.toLowerCase() + '.';
      r[c.id] = x;
    }
    setErros(e);
    const falta = campos.find((c) => e[c.id]);
    if (falta) { document.getElementById('f_' + falta.id)?.focus(); vibrar(); return; }
    onEnviar(r);
  }
  return (
    <form onSubmit={(ev) => { ev.preventDefault(); enviar(); }} noValidate
      onKeyDown={(ev) => {
        /* "Próximo" no teclado vai para o campo seguinte; só o último envia. */
        if (ev.key !== 'Enter') return;
        const alvo = ev.target as HTMLElement;
        const i = campos.findIndex((c) => alvo.id === 'f_' + c.id);
        if (i >= 0 && i < campos.length - 1) {
          ev.preventDefault();
          document.getElementById('f_' + campos[i + 1].id)?.focus();
        }
      }}>
      <div className="px-2">
        {campos.map((c, i) => (
          <Campo
            key={c.id}
            id={'f_' + c.id}
            rotulo={c.rotulo}
            ref={i === 0 ? primeiro : undefined}
            type={c.tipo || 'text'}
            autoComplete="off"
            autoCapitalize={!c.tipo || c.tipo === 'text' ? 'words' : 'none'}
            enterKeyHint={i === campos.length - 1 ? 'done' : 'next'}
            placeholder={c.dica}
            value={v[c.id]}
            erro={erros[c.id]}
            onChange={(ev) => { setV({ ...v, [c.id]: ev.target.value }); if (erros[c.id]) setErros({ ...erros, [c.id]: '' }); }}
          />
        ))}
      </div>
      <Acoes rotulo={rotuloBotao} perigo={false} onCancelar={onCancelar} onConfirmar={enviar} />
      <button type="submit" hidden />
    </form>
  );
}

/* ─── a folha em si, montada uma vez no topo do app ─── */
export function Folha() {
  const e = useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => estado);
  const [visivel, setVisivel] = useState(false);
  const [arrasto, setArrasto] = useState<number | null>(null);
  const toque0 = useRef<{ y: number; t: number; doCorpo: boolean } | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const rolo = useRef<HTMLDivElement>(null);
  const antesDoFoco = useRef<HTMLElement | null>(null);

  /* Fechada só por transform, a folha continuava alcançável por Tab e
     lida pelo leitor de tela. Depois da animação, sai do DOM. */
  useEffect(() => {
    if (e.aberta) { setVisivel(true); return; }
    const t = setTimeout(() => setVisivel(false), 320);
    return () => clearTimeout(t);
  }, [e.aberta]);

  /* Aberta: fundo parado, foco dentro. Fechada: foco volta para quem abriu. */
  useEffect(() => {
    if (!e.aberta) return;
    antesDoFoco.current = document.activeElement as HTMLElement | null;
    const corpo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const c = caixa.current;
      if (c && !c.contains(document.activeElement)) c.focus({ preventScroll: true });
    }, 60);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = corpo;
      const volta = antesDoFoco.current;
      if (volta && document.contains(volta)) volta.focus({ preventScroll: true });
    };
  }, [e.aberta, e.id]);

  useEffect(() => {
    const k = (ev: KeyboardEvent) => {
      if (!estado.aberta) return;
      if (ev.key === 'Escape') { folha.fechar(); return; }
      /* Tab não sai da folha. */
      if (ev.key !== 'Tab' || !caixa.current) return;
      const foc = [...caixa.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((x) => !x.hasAttribute('disabled') && x.offsetParent !== null);
      if (!foc.length) return;
      const pri = foc[0], ult = foc[foc.length - 1];
      if (ev.shiftKey && document.activeElement === pri) { ev.preventDefault(); ult.focus(); }
      else if (!ev.shiftKey && document.activeElement === ult) { ev.preventDefault(); pri.focus(); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  /* Arrastar para fechar: pelo puxador e título, ou pelo corpo quando ele
     está rolado até o topo. Fecha passando de 90px ou num peteleco. */
  function comeca(ev: React.TouchEvent, doCorpo: boolean) {
    if (doCorpo && (rolo.current?.scrollTop || 0) > 0) { toque0.current = null; return; }
    toque0.current = { y: ev.touches[0].clientY, t: ev.timeStamp, doCorpo };
  }
  function move(ev: React.TouchEvent) {
    const t = toque0.current;
    if (!t) return;
    const dy = ev.touches[0].clientY - t.y;
    if (t.doCorpo && dy < 8 && arrasto === null) return;   // no corpo, subir é rolar
    setArrasto(Math.max(0, dy));
  }
  function solta(ev: React.TouchEvent) {
    const t = toque0.current;
    toque0.current = null;
    const dy = arrasto || 0;
    setArrasto(null);
    if (!t) return;
    const vel = dy / Math.max(1, ev.timeStamp - t.t);
    if (dy > 90 || (vel > 0.5 && dy > 30)) folha.fechar();
  }
  const corpo = typeof e.corpo === 'function' ? (e.corpo as (f: () => void) => ReactNode)(folha.fechar) : e.corpo;

  return (
    <>
      <div
        onClick={folha.fechar}
        aria-hidden="true"
        className={clsx('fixed inset-0 z-40 touch-none bg-tinta/50 transition-opacity duration-240 ease-curva',
          e.aberta ? 'opacity-100' : 'pointer-events-none opacity-0')}
      />
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby="folhaTitulo"
        tabIndex={-1}
        hidden={!visivel && !e.aberta}
        style={arrasto ? { transform: `translateY(${arrasto}px)`, transition: 'none' } : undefined}
        className={clsx(
          'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-[644px] flex-col rounded-t-g bg-papel outline-none',
          'pt-2 pb-[calc(12px+env(safe-area-inset-bottom))] transition-transform duration-300 ease-curva',
          e.aberta ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div onTouchStart={(ev) => comeca(ev, false)} onTouchMove={move} onTouchEnd={solta} className="shrink-0 touch-none">
          <div className="mx-auto mt-1 mb-3 h-1 w-[38px] rounded-full bg-[#D9CFE2]" />
          <h2 id="folhaTitulo" className="mx-5 mb-2 text-[17px] font-bold tracking-tight">{e.titulo}</h2>
        </div>
        <div key={e.id} ref={rolo} onTouchStart={(ev) => comeca(ev, true)} onTouchMove={move} onTouchEnd={solta}
          className="overflow-y-auto overscroll-contain px-3">
          {visivel || e.aberta ? corpo : null}
        </div>
      </div>
    </>
  );
}
