/* Resumo dos materiais: números, o que vai para o bazar, o que precisa
   de conserto, e os grupos por categoria e por local. Tocar num grupo
   mostra os itens ou muda o nome em todos de uma vez. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Package, Pencil, Search } from 'lucide-react';
import { escrever } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Esqueleto, Estado, Linha, Lista } from '../../../ui/kit';
import { CabecalhoSecao, CARTAO_ELEVADO } from '../../../ui/Heroi';
import { clsx } from 'clsx';
import { ErroTela } from '../../../ui/ErroTela';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { plural, textoErro, vibrar } from '../../../util';
import { ehBazar, Qtd, useMateriais, type Material } from './-comum';

export const Route = createFileRoute('/_app/materiais/resumo')({ component: Resumo });

type Grupo = { nome: string; itens: number; un: number };
function agrupar(itens: Material[], chave: (i: Material) => string): Grupo[] {
  const m = new Map<string, Grupo>();
  itens.forEach((i) => {
    const k = chave(i);
    const g = m.get(k) || { nome: k, itens: 0, un: 0 };
    g.itens++; g.un += i.quantidade;
    m.set(k, g);
  });
  return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function Resumo() {
  const navigate = useNavigate();
  const q = useMateriais();
  const itens = q.data?.itens;

  if (!itens) {
    return (
      <Tela titulo="Resumo dos materiais" voltar="/materiais">
        {q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={4} />}
      </Tela>
    );
  }
  if (!itens.length) {
    return (
      <Tela titulo="Resumo dos materiais" voltar="/materiais">
        <Estado icone={Package} titulo="Nenhum item ainda" texto="O resumo aparece quando houver materiais cadastrados."
          botao={{ txt: 'Cadastrar o primeiro item', fn: () => navigate({ to: '/materiais/novo' }) }} />
      </Tela>
    );
  }

  const unidades = itens.reduce((s, i) => s + i.quantidade, 0);
  const porCat = agrupar(itens, (i) => i.categoria);
  const porLocal = agrupar(itens, (i) => i.local || 'Sem local');
  const abrir = (i: Material) => navigate({ to: '/materiais/$id', params: { id: i.id } });

  function opcoes(campo: 'categoria' | 'local', c: string) {
    const vazio = c === 'Sem categoria' || c === 'Sem local';
    folha.opcoes(c, [
      {
        txt: 'Ver os itens', icone: Search,
        fn: () => navigate({ to: '/materiais', search: campo === 'categoria' ? { categoria: c } : vazio ? {} : { busca: c } }),
      },
      ...(vazio ? [] : [{
        txt: 'Mudar o nome', sub: 'muda em todos os itens de uma vez', icone: Pencil,
        fn: () => folha.pedirTexto('Mudar o nome', campo === 'categoria' ? 'Novo nome da categoria' : 'Novo nome do local',
          c, 'Mudar', (novo) => {
            escrever<{ mudou: number }>('renomearNaLista', [campo, c, novo]).then((r) => {
              vibrar(); toast(plural(r.mudou, 'item mudou', 'itens mudaram') + ' para ' + novo);
            }, (e) => toast(textoErro(e), 'erro'));
          }),
      }]),
    ]);
  }

  const listaItens = (titulo: string, lista: Material[], vazio: string) => (
    <>
      <CabecalhoSecao titulo={titulo} className="mt-4" />
      {lista.length ? (
        <Lista semAvatar>
          {lista.map((i) => (
            <Linha key={i.id} onClick={() => abrir(i)} titulo={i.item} sub={i.local || 'sem local'} direita={<Qtd n={i.quantidade} />} />
          ))}
        </Lista>
      ) : <p className="mx-4 mb-2 text-[13px] text-apagado">{vazio}</p>}
    </>
  );
  const listaGrupos = (titulo: string, campo: 'categoria' | 'local', gs: Grupo[]) => (
    <>
      <CabecalhoSecao titulo={titulo} className="mt-4" />
      <Lista semAvatar>
        {gs.map((g) => (
          <Linha key={g.nome} onClick={() => opcoes(campo, g.nome)} titulo={g.nome}
            sub={plural(g.un, 'unidade', 'unidades')}
            direita={<span className="min-w-11 shrink-0 text-right text-[17px] font-bold tabular-nums"
              aria-label={plural(g.itens, 'item', 'itens')}>{g.itens}</span>} />
        ))}
      </Lista>
    </>
  );

  return (
    <Tela titulo="Resumo dos materiais" voltar="/materiais">
      {/* O cartão principal (DNA): os três números de relance. */}
      <div className={clsx(CARTAO_ELEVADO, 'mb-2 grid grid-cols-3 divide-x divide-borda py-4')}>
        {[
          { n: itens.length, txt: itens.length === 1 ? 'item' : 'itens' },
          { n: unidades, txt: unidades === 1 ? 'unidade' : 'unidades' },
          { n: porCat.length, txt: porCat.length === 1 ? 'categoria' : 'categorias' },
        ].map((x) => (
          <div key={x.txt} className="px-2 text-center">
            <b className="block text-[28px] leading-none font-extrabold tracking-tight text-roxo tabular-nums">{x.n}</b>
            <span className="mt-1 block text-xs font-semibold text-apagado">{x.txt}</span>
          </div>
        ))}
      </div>
      {listaItens('Para o bazar', itens.filter(ehBazar), 'Nenhum item marcado para o bazar.')}
      {listaItens('Precisam de reparo', itens.filter((i) => i.estado === 'Precisa reparo'), 'Nada quebrado. Ótimo.')}
      {listaGrupos('Por categoria', 'categoria', porCat)}
      {listaGrupos('Por local', 'local', porLocal)}
      <p className="mx-4 text-[13px] leading-normal text-apagado">
        Toque numa categoria ou num local para ver os itens ou mudar o nome.
      </p>
    </Tela>
  );
}
