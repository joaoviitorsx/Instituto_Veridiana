/* Folha que sobe de baixo (bottom sheet), reaproveitada por todo o app.

   folha.abrir(titulo, corpo)            conteúdo livre
   folha.opcoes(titulo, [{txt, fn}])     lista de escolhas
   folha.confirmar(titulo, texto, rotulo, fn)
   folha.pedirTexto(titulo, rotulo, valor, rotuloBotao, fn)
   folha.pedirFicha(titulo, campos, rotuloBotao, fn)

   Funções soltas, como no AppNucleo.html: qualquer tela chama sem hook. */
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { vibrar } from '../util';
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

/* Fecha antes e roda depois: a ação da opção pode abrir outra folha. */
function depois(fn?: () => void) { if (fn) setTimeout(fn, 60); }

export const folha = {
  abrir(titulo: string, corpo: Corpo, o: { aoFechar?: () => void } = {}) {
    mudar({ aberta: true, titulo, corpo, aoFechar: o.aoFechar, id: estado.id + 1 });
  },
  fechar() {
    if (!estado.aberta) return;
    const f = estado.aoFechar;
    mudar({ ...estado, aberta: false, aoFechar: undefined });
    f?.();
  },
  aberta() { return estado.aberta; },

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
    <div className="flex shrink-0 gap-2 px-2 pt-3">
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
    <form onSubmit={(ev) => { ev.preventDefault(); enviar(); }} noValidate>
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
  const y0 = useRef(0);

  /* Fechada só por transform, a folha continuava alcançável por Tab e
     lida pelo leitor de tela. Depois da animação, sai do DOM. */
  useEffect(() => {
    if (e.aberta) { setVisivel(true); return; }
    const t = setTimeout(() => setVisivel(false), 320);
    return () => clearTimeout(t);
  }, [e.aberta]);

  useEffect(() => {
    const k = (ev: KeyboardEvent) => { if (ev.key === 'Escape') folha.fechar(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);

  const toque = {
    onTouchStart: (ev: React.TouchEvent) => { y0.current = ev.touches[0].clientY; setArrasto(0); },
    onTouchMove: (ev: React.TouchEvent) => { if (arrasto !== null) setArrasto(Math.max(0, ev.touches[0].clientY - y0.current)); },
    onTouchEnd: () => { if ((arrasto || 0) > 90) folha.fechar(); setArrasto(null); },
  };
  const corpo = typeof e.corpo === 'function' ? (e.corpo as (f: () => void) => ReactNode)(folha.fechar) : e.corpo;

  return (
    <>
      <div
        onClick={folha.fechar}
        className={clsx('fixed inset-0 z-40 bg-tinta/50 transition-opacity duration-240 ease-curva',
          e.aberta ? 'opacity-100' : 'pointer-events-none opacity-0')}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="folhaTitulo"
        hidden={!visivel && !e.aberta}
        style={arrasto ? { transform: `translateY(${arrasto}px)`, transition: 'none' } : undefined}
        className={clsx(
          'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[80vh] max-w-[644px] flex-col rounded-t-g bg-papel',
          'pt-2 pb-[calc(12px+env(safe-area-inset-bottom))] transition-transform duration-300 ease-curva',
          e.aberta ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div {...toque} className="shrink-0">
          <div className="mx-auto mt-1 mb-3 h-1 w-[38px] rounded-full bg-[#D9CFE2]" />
          <h2 id="folhaTitulo" className="mx-5 mb-2 text-[17px] font-bold tracking-tight">{e.titulo}</h2>
        </div>
        <div key={e.id} className="overflow-y-auto px-3">{visivel || e.aberta ? corpo : null}</div>
      </div>
    </>
  );
}
