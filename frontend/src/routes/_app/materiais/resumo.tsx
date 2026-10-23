/* Resumo dos materiais: números, o que vai para o bazar, o que precisa
   de conserto, e os grupos por categoria e por local. Tocar num grupo
   mostra os itens ou muda o nome em todos de uma vez. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Package, Pencil, Search } from 'lucide-react';
import { escrever } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Esqueleto, Estado, Linha, Lista, Numeros, Secao } from '../../../ui/kit';
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
        <Estado icone={Package} titulo="Nenhum item ainda" texto="Cadastre os materiais pela lista." />
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
      <Secao>{titulo}</Secao>
      {lista.length ? (
        <Lista semAvatar>
          {lista.map((i) => (
            <Linha key={i.id} onClick={() => abrir(i)} titulo={i.item} sub={i.local || 'sem local'} direita={<Qtd n={i.quantidade} />} />
          ))}
        </Lista>
      ) : <p className="mx-1 text-[13px] text-apagado">{vazio}</p>}
    </>
  );
  const listaGrupos = (titulo: string, campo: 'categoria' | 'local', gs: Grupo[]) => (
    <>
      <Secao>{titulo}</Secao>
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
      <Numeros itens={[
        { n: itens.length, txt: itens.length === 1 ? 'item' : 'itens' },
        { n: unidades, txt: 'unidades' },
        { n: porCat.length, txt: porCat.length === 1 ? 'categoria' : 'categorias' },
      ]} />
      {listaItens('Para o bazar', itens.filter(ehBazar), 'Nenhum item marcado para o bazar.')}
      {listaItens('Precisam de reparo', itens.filter((i) => i.estado === 'Precisa reparo'), 'Nada quebrado. Ótimo.')}
      {listaGrupos('Por categoria', 'categoria', porCat)}
      {listaGrupos('Por local', 'local', porLocal)}
      <p className="mx-1 text-[13px] leading-normal text-apagado">
        Toque numa categoria ou num local para ver os itens ou mudar o nome.
      </p>
    </Tela>
  );
}
