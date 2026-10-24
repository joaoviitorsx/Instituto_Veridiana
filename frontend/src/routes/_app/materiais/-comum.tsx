/* Materiais: estrutura fixa, categorias livres. Cadastro rápido é a
   única métrica que importa aqui: cadastro lento não acontece.

   Peças comuns às telas da seção (lista, ficha, cadastro, resumo). O
   prefixo '-' deixa este arquivo fora das rotas. */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, MapPin, Minus, Plus, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import { api, invalidarDepoisDe, leitura } from '../../../api/cliente';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { semAcento, textoErro, vibrar } from '../../../util';

export type Material = {
  id: string; item: string; categoria: string; finalidade: string;
  quantidade: number; estado: string; local: string; obs: string;
};
export type ListaLivre = { usadas: string[]; sugestoes: string[] };
export type Materiais = {
  itens: Material[]; categorias: ListaLivre; locais: ListaLivre;
  finalidades: string[]; estados: string[];
};

/* Sem filtro no servidor: a tela filtra no celular (busca letra a letra
   não pode esperar o servidor). É a mesma chave que a tela inicial já
   deixou carregando por trás. */
export const lerMateriais = () => leitura<Materiais>('listarMateriais', {});
export function useMateriais(o: { fresco?: boolean } = {}) {
  return useQuery({ ...lerMateriais(), ...(o.fresco ? { staleTime: 300_000 } : {}) });
}

/* "Ambos" é instituto e bazar: aparece no filtro de cada um. */
export function bateFinalidade(i: Material, f?: string) {
  if (!f) return true;
  if (f === 'Instituto' || f === 'Bazar') return i.finalidade === f || i.finalidade === 'Ambos';
  return i.finalidade === f;
}
export const ehBazar = (i: Material) => i.finalidade === 'Bazar' || i.finalidade === 'Ambos';
export const ehRuim = (i: Material) => i.estado === 'Precisa reparo' || i.estado === 'Inservível';
export const nomeFinalidade = (f: string) => (f === 'Ambos' ? 'Instituto e bazar' : f);

/* Cadastro em série (ela arrumando o depósito): categoria, local e
   finalidade repetem os do último item salvo. Só na memória. */
export const ultimoSalvo: { categoria?: string; local?: string; finalidade?: string } = {};

/* Grupos recolhidos na lista: valem enquanto o app está aberto. */
export const gruposFechados = new Set<string>();

/* ─── peças visuais ─── */
export function SeloEstado({ estado }: { estado: string }) {
  return (
    <span className="ml-1 inline-block rounded-full bg-falta-fraco px-2 py-px align-[1px] text-xs font-bold text-falta">
      {estado}
    </span>
  );
}

export function Qtd({ n }: { n: number }) {
  return (
    <span className="min-w-11 shrink-0 text-right text-[17px] font-bold tabular-nums"
      aria-label={n + (n === 1 ? ' unidade' : ' unidades')}>
      {n}
    </span>
  );
}

/* Botão quadrado de mais e menos. */
export function BotaoQtd({ mais, grande, onClick, disabled }: {
  mais?: boolean; grande?: boolean; onClick: () => void; disabled?: boolean;
}) {
  const Ic = mais ? Plus : Minus;
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={mais ? 'Mais um' : 'Menos um'}
      className={clsx('grid shrink-0 place-items-center rounded-m border border-borda bg-papel text-roxo',
        'transition-colors duration-150 active:bg-roxo-fraco disabled:opacity-40',
        grande ? 'size-16' : 'size-13')}>
      <Ic size={grande ? 26 : 22} />
    </button>
  );
}

/* ─── categoria e local ───
   O que já existe, sugestões enquanto a lista é curta, e "criar" no fim.
   É aqui que mora a liberdade que a coordenação pediu. */
export function escolherNaLista(campo: 'categoria' | 'local', lista: ListaLivre, atual: string, aplicar: (v: string) => void) {
  const ehCat = campo === 'categoria';
  const Ic = ehCat ? Tag : MapPin;
  const escolher = (v: string) => { aplicar(v); vibrar(); };
  const linha = (v: string, fechar: () => void) => (
    <li key={v}>
      <button type="button" aria-selected={atual === v} onClick={() => { fechar(); escolher(v); }}
        className="flex min-h-14 w-full items-center gap-3 rounded-p p-3 text-left text-base font-semibold active:bg-fundo">
        <Ic size={20} className="shrink-0" />
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{v}</span>
        <Check size={20} className={clsx('shrink-0 text-roxo', atual !== v && 'opacity-0')} />
      </button>
    </li>
  );
  function criar() {
    setTimeout(() => folha.pedirTexto(ehCat ? 'Nova categoria' : 'Novo local',
      ehCat ? 'Nome da categoria' : 'Nome do lugar', '', 'Usar', (txt) => {
        /* Mesma coisa com outra grafia vira a existente: "som e audio"
           não pode nascer como categoria nova ao lado de "Som e áudio". */
        const igual = lista.usadas.concat(lista.sugestoes).find((x) => semAcento(x) === semAcento(txt));
        escolher(igual || txt);
      }), 60);
  }
  folha.abrir(ehCat ? 'Categoria' : 'Onde fica', (fechar) => (
    <>
      {lista.usadas.length > 0 && <ul>{lista.usadas.map((v) => linha(v, fechar))}</ul>}
      {lista.sugestoes.length > 0 && (
        <>
          <p className="mx-3 mt-3 mb-1 text-[13px] font-semibold text-apagado">Sugestões</p>
          <ul>{lista.sugestoes.map((v) => linha(v, fechar))}</ul>
        </>
      )}
      <ul>
        <li>
          <button type="button" onClick={() => { fechar(); criar(); }}
            className="flex min-h-14 w-full items-center gap-3 rounded-p p-3 text-left text-base font-semibold text-roxo active:bg-fundo">
            <Plus size={20} /> Criar {ehCat ? 'categoria' : 'local'}
          </button>
        </li>
        {atual && (
          <li>
            <button type="button" onClick={() => { fechar(); escolher(''); }}
              className="flex min-h-14 w-full items-center gap-3 rounded-p p-3 text-left text-base font-semibold active:bg-fundo">
              <Minus size={20} /> Deixar sem {ehCat ? 'categoria' : 'local'}
            </button>
          </li>
        )}
      </ul>
    </>
  ));
}

/* ─── mais e menos na ficha ───
   Respondem na hora e mandam um ajuste só depois que o dedo para: cinco
   toques seguidos são uma escrita, não cinco. Sair da tela no meio
   manda o que faltava. */
export function useAjuste(item: Material | undefined) {
  const qc = useQueryClient();
  const [delta, setDelta] = useState(0);
  const pend = useRef({ id: '', delta: 0, t: 0 as ReturnType<typeof setTimeout> | 0 });

  function enviar() {
    const p = pend.current;
    if (p.t) clearTimeout(p.t);
    const { id, delta: d } = p;
    pend.current = { id: '', delta: 0, t: 0 };
    if (!id || !d) return;
    api<{ ok: boolean; quantidade: number }>('ajustarQuantidade', [id, d]).then((r) => {
      /* O número novo entra no cache na hora: a ficha não pisca de volta
         para o antigo enquanto a lista recarrega. */
      qc.setQueryData<Materiais>(lerMateriais().queryKey, (m) => m && {
        ...m, itens: m.itens.map((i) => (i.id === id ? { ...i, quantidade: r.quantidade } : i)),
      });
      setDelta((x) => x - d);
      invalidarDepoisDe('ajustarQuantidade');
    }, (e) => {
      setDelta((x) => x - d);
      toast('A quantidade não foi salva: ' + textoErro(e) + ' Toque de novo para tentar.', 'erro');
    });
  }

  function somar(n: number) {
    if (!item) return;
    if (item.quantidade + delta + n < 0) return;
    const p = pend.current;
    p.id = item.id;
    p.delta += n;
    setDelta((x) => x + n);
    vibrar();
    if (p.t) clearTimeout(p.t);
    p.t = setTimeout(enviar, 800);
  }

  useEffect(() => () => enviar(), []);

  return { quantidade: item ? Math.max(0, item.quantidade + delta) : 0, somar, enviar };
}

/* Erro embaixo de um campo montado à mão (a quantidade, com mais/menos),
   igual ao erro de campo do kit: ícone + texto, lido pelo leitor de tela. */
export function ErroLinha({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null;
  return (
    <span id={id + '-erro'} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug font-medium text-falta">
      <CircleAlert size={16} className="mt-px shrink-0" />{erro}
    </span>
  );
}
