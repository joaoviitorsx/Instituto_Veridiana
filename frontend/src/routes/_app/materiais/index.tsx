/* Lista de materiais: atalhos com número, busca, filtros e grupos por
   categoria. Os filtros moram na URL: voltar da ficha devolve a lista
   como estava. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ChevronRight, KeyRound, Package, Plus, Search, Table, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import { Tela } from '../../../ui/Tela';
import { BotaoCheio, Busca, Esqueleto, Estado, Linha, Lista } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { folha } from '../../../ui/folha';
import { semAcento, vibrar } from '../../../util';
import { bateFinalidade, ehBazar, ehRuim, gruposFechados, Qtd, SeloEstado, useMateriais, type Material } from './-comum';

type Filtros = { categoria?: string; finalidade?: string; estado?: string; busca?: string };
const texto = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 120) : undefined);

export const Route = createFileRoute('/_app/materiais/')({
  validateSearch: (s: Record<string, unknown>): Filtros => ({
    categoria: texto(s.categoria), finalidade: texto(s.finalidade), estado: texto(s.estado), busca: texto(s.busca),
  }),
  component: ListaMateriais,
});

function ListaMateriais() {
  const F = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const q = useMateriais();
  /* A busca responde no dedo; a URL acompanha sem criar histórico. */
  const [busca, setBusca] = useState(F.busca || '');
  const [fechados, setFechados] = useState(() => new Set(gruposFechados));

  const mudar = (f: Filtros) => navigate({ search: (a) => ({ ...a, ...f }), replace: true });
  const todos = q.data?.itens || [];
  const nBazar = todos.filter(ehBazar).length;
  const nReparo = todos.filter((i) => i.estado === 'Precisa reparo').length;

  const lista = useMemo(() => {
    const b = semAcento(busca);
    return todos.filter((i) => {
      if (F.categoria && i.categoria !== F.categoria) return false;
      if (!bateFinalidade(i, F.finalidade)) return false;
      if (F.estado && i.estado !== F.estado) return false;
      return !b || semAcento(i.item).includes(b) || semAcento(i.local).includes(b);
    });
  }, [todos, busca, F.categoria, F.finalidade, F.estado]);

  const grupos = useMemo(() => {
    const m = new Map<string, Material[]>();
    lista.forEach((i) => { if (!m.has(i.categoria)) m.set(i.categoria, []); m.get(i.categoria)!.push(i); });
    return [...m.entries()];
  }, [lista]);

  function alternarGrupo(g: string) {
    const n = new Set(fechados);
    if (n.has(g)) { n.delete(g); gruposFechados.delete(g); } else { n.add(g); gruposFechados.add(g); }
    setFechados(n);
  }

  function escolherFiltro(campo: 'categoria' | 'finalidade' | 'estado') {
    const d = q.data!;
    const valores = campo === 'categoria'
      ? [...new Set(todos.map((i) => i.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
      : campo === 'finalidade' ? d.finalidades : d.estados;
    const titulo = campo === 'categoria' ? 'Categoria' : campo === 'finalidade' ? 'Finalidade' : 'Estado';
    folha.opcoes(titulo, [
      { txt: campo === 'estado' ? 'Todos' : 'Todas', marcado: !F[campo], fn: () => mudar({ [campo]: undefined }) },
      ...valores.map((v) => ({
        txt: v, sub: campo === 'finalidade' && v === 'Ambos' ? 'instituto e bazar' : undefined,
        marcado: F[campo] === v, fn: () => mudar({ [campo]: v }),
      })),
    ]);
  }

  const algumFiltro = !!(F.categoria || F.finalidade || F.estado || busca);
  const limpar = () => { setBusca(''); vibrar(); navigate({ search: {}, replace: true }); };

  return (
    <Tela titulo="Materiais" voltar="/"
      barra={<BotaoCheio icone={Plus} onClick={() => navigate({ to: '/materiais/novo' })}>Novo item</BotaoCheio>}>
      {/* Os dois atalhos com valor operacional: o que vai para o bazar e
          o que precisa de conserto. Com número, sem abrir filtro. */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Atalho ligado={F.finalidade === 'Bazar'} icone={Tag} n={q.data ? nBazar : undefined}
          onClick={() => { vibrar(); mudar({ finalidade: F.finalidade === 'Bazar' ? undefined : 'Bazar' }); }}>
          Para o bazar
        </Atalho>
        <Atalho ligado={F.estado === 'Precisa reparo'} icone={KeyRound} n={q.data ? nReparo : undefined}
          onClick={() => { vibrar(); mudar({ estado: F.estado === 'Precisa reparo' ? undefined : 'Precisa reparo' }); }}>
          Precisa reparo
        </Atalho>
        <Atalho icone={Table} onClick={() => navigate({ to: '/materiais/resumo' })}>Resumo</Atalho>
      </div>

      <Busca placeholder="Procurar item" aria-label="Procurar item" value={busca}
        onChange={(e) => { setBusca(e.target.value); mudar({ busca: e.target.value || undefined }); }} />

      <div className="mb-3 grid grid-cols-3 gap-2">
        <BotaoFiltro rotulo="Categoria" valor={F.categoria} vazio="Todas" onClick={() => q.data && escolherFiltro('categoria')} />
        <BotaoFiltro rotulo="Finalidade" valor={F.finalidade} vazio="Todas" onClick={() => q.data && escolherFiltro('finalidade')} />
        <BotaoFiltro rotulo="Estado" valor={F.estado} vazio="Todos" onClick={() => q.data && escolherFiltro('estado')} />
      </div>

      {!q.data ? (
        q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={5} />
      ) : !todos.length ? (
        <Estado icone={Package} titulo="Nenhum item ainda"
          texto='Toque em "Novo item" aqui embaixo. Nome, quantidade e onde fica já bastam.' />
      ) : (
        <>
          {algumFiltro && (
            <button type="button" onClick={limpar}
              className="-mt-1 mb-3 ml-auto block min-h-11 px-1 text-sm font-semibold text-roxo">
              Limpar filtros
            </button>
          )}
          {!lista.length ? (
            <Estado icone={Search} titulo="Nada com esse filtro" texto="Troque o filtro ou limpe a busca." />
          ) : grupos.map(([cat, itens]) => {
            const aberto = !fechados.has(cat);
            return (
              <div key={cat} className="mb-1">
                <button type="button" aria-expanded={aberto} onClick={() => alternarGrupo(cat)}
                  className="flex min-h-13 w-full items-center gap-2 px-1 text-left text-sm font-semibold text-apagado">
                  <ChevronRight size={18} className={clsx('shrink-0 transition-transform duration-200 ease-curva', aberto && 'rotate-90')} />
                  <span className="min-w-0 flex-1 truncate">{cat}</span>
                  <span className="tabular-nums">{itens.length}</span>
                </button>
                {aberto && (
                  <Lista semAvatar>
                    {itens.map((i) => (
                      <Linha key={i.id}
                        onClick={() => navigate({ to: '/materiais/$id', params: { id: i.id } })}
                        titulo={<>{i.item}{ehRuim(i) && <SeloEstado estado={i.estado} />}</>}
                        sub={[i.local || 'sem local', ehBazar(i) ? 'bazar' : ''].filter(Boolean).join(' · ')}
                        direita={<Qtd n={i.quantidade} />} />
                    ))}
                  </Lista>
                )}
              </div>
            );
          })}
        </>
      )}
    </Tela>
  );
}

function Atalho({ ligado, icone: Ic, n, onClick, children }: {
  ligado?: boolean; icone: typeof Tag; n?: number; onClick: () => void; children: string;
}) {
  return (
    <button type="button" aria-pressed={ligado} onClick={onClick}
      className={clsx('flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold whitespace-nowrap',
        'transition-colors duration-150',
        ligado ? 'border-roxo bg-roxo text-white' : 'border-borda bg-papel text-roxo active:bg-roxo-fraco')}>
      <Ic size={18} /> {children}
      {n !== undefined && <b className="tabular-nums">{n}</b>}
    </button>
  );
}

function BotaoFiltro({ rotulo, valor, vazio, onClick }: { rotulo: string; valor?: string; vazio: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={clsx('min-h-12 min-w-0 overflow-hidden rounded-p bg-papel text-left text-xs leading-tight font-semibold text-apagado',
        valor ? 'border-2 border-roxo px-[7px] py-[5px]' : 'border border-borda px-2 py-1.5')}>
      {rotulo}
      <b className={clsx('mt-0.5 block truncate text-sm', valor ? 'text-roxo' : 'text-tinta')}>{valor || vazio}</b>
    </button>
  );
}
