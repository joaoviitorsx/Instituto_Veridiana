/* Ficha do item: quantidade grande com mais e menos, os dados, e as
   duas saídas — inservível (fica na lista) e tirar da lista. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CircleAlert, Pencil, Trash2 } from 'lucide-react';
import { escrever } from '../../../../api/cliente';
import { Tela, useVoltar } from '../../../../ui/Tela';
import { BotaoCheio, Esqueleto, Estado, Lista } from '../../../../ui/kit';
import { ErroTela } from '../../../../ui/ErroTela';
import { folha } from '../../../../ui/folha';
import { toast } from '../../../../ui/toast';
import { textoErro, vibrar } from '../../../../util';
import { BotaoQtd, nomeFinalidade, useAjuste, useMateriais } from '../-comum';
import { CabecalhoSecao, CARTAO_ELEVADO } from '../../../../ui/Heroi';
import { clsx } from 'clsx';

export const Route = createFileRoute('/_app/materiais/$id/')({ component: Ficha });

function Ficha() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const voltar = useVoltar('/materiais');
  const q = useMateriais();
  const it = q.data?.itens.find((i) => i.id === id);
  const aj = useAjuste(it);

  if (!it) {
    return (
      <Tela titulo="Item" voltar="/materiais">
        {q.data ? <Estado icone={CircleAlert} titulo="Item não encontrado" texto="Volte para a lista e abra de novo." />
          : q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={4} />}
      </Tela>
    );
  }
  const item = it;

  function inservivel() {
    folha.confirmar('Marcar como inservível',
      item.item + ' continua na lista, marcado como sem uso. Se foi para o lixo, use "Tirar da lista".',
      'Marcar', () => {
        escrever('editarMaterial', [item.id, { estado: 'Inservível' }]).then(() => {
          vibrar(); toast(item.item + ' marcado como inservível');
        }, (e) => toast(textoErro(e), 'erro'));
      });
  }
  function descartar() {
    folha.confirmar('Tirar da lista',
      item.item + ' sai da lista de materiais. A linha continua guardada na planilha.',
      'Tirar da lista', () => {
        escrever('inativarMaterial', [item.id]).then(() => {
          vibrar(); toast(item.item + ' saiu da lista'); voltar();
        }, (e) => toast(textoErro(e), 'erro'));
      });
  }

  const dados: [string, string][] = [
    ['Categoria', item.categoria],
    ['Onde fica', item.local || 'sem local'],
    ['Estado', item.estado],
    ['Para que serve', nomeFinalidade(item.finalidade)],
  ];
  if (item.obs) dados.push(['Observação', item.obs]);

  return (
    <Tela titulo={item.item} voltar="/materiais"
      barra={<BotaoCheio icone={Pencil} className="text-[17px]"
        onClick={() => { aj.enviar(); navigate({ to: '/materiais/$id/editar', params: { id: item.id } }); }}>Editar</BotaoCheio>}>
      {/* O cartão principal da ficha (DNA): o nome e a quantidade, que é o
          que mais se mexe. */}
      <div className={clsx(CARTAO_ELEVADO, 'mb-5 px-4 pt-4 pb-3 text-center')}>
        <small className="block text-xs font-bold tracking-[.06em] text-roxo uppercase">{item.categoria}</small>
        <h2 className="mt-0.5 text-[22px] leading-tight font-bold tracking-tight [overflow-wrap:anywhere]">{item.item}</h2>
        <div className="mt-4 flex items-center justify-center gap-2">
          <BotaoQtd grande onClick={() => aj.somar(-1)} disabled={aj.quantidade === 0} />
          <output aria-live="polite" className="min-w-24 text-center text-[40px] leading-none font-bold tracking-tight tabular-nums">
            {aj.quantidade}
          </output>
          <BotaoQtd grande mais onClick={() => aj.somar(1)} />
        </div>
        <p className="mt-2 text-[13px] text-apagado">{aj.quantidade === 1 ? 'unidade' : 'unidades'}</p>
      </div>

      <CabecalhoSecao titulo="Detalhes" />
      <Lista semAvatar>
        {dados.map(([r, v]) => (
          <li key={r}
            className="relative px-4 py-3 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4 not-first:before:h-px not-first:before:bg-borda not-first:before:content-['']">
            <small className="mb-0.5 block text-[13px] text-apagado">{r}</small>
            <span className="block text-base font-semibold [overflow-wrap:anywhere]">{v}</span>
          </li>
        ))}
      </Lista>

      <CabecalhoSecao titulo="Quando não serve mais" className="mt-2" />
      {item.estado !== 'Inservível' && (
        <button type="button" onClick={inservivel}
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-m border border-borda bg-papel p-3.5 text-base font-bold text-tinta transition-colors duration-150 active:bg-fundo">
          <CircleAlert size={18} /> Marcar como inservível
        </button>
      )}
      <button type="button" onClick={descartar}
        className="mt-3 flex min-h-13 w-full items-center justify-center gap-2 rounded-m border border-falta/30 bg-papel p-3.5 text-base font-bold text-falta transition-colors duration-150 active:bg-falta-fraco">
        <Trash2 size={18} /> Tirar da lista
      </button>
    </Tela>
  );
}
