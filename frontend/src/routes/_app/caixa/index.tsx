/* Fluxo de caixa: o mês. Lançar em poucos toques, do celular, entre uma
   aula e outra. Dois botões grandes no rodapé: entrou, saiu. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Minus, Plus, Trash2, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { escrever, leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { CARTAO, Esqueleto, Estado, Lista, Secao } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { dataExtenso, hojeISO, mesExtenso, plural, reais, textoErro, urlSegura, vibrar } from '../../../util';
import { MES_RE, type Lancamento, type MesCaixa } from './-tipos';

export const Route = createFileRoute('/_app/caixa/')({
  validateSearch: (s: Record<string, unknown>): { mes?: string } =>
    typeof s.mes === 'string' && MES_RE.test(s.mes) ? { mes: s.mes } : {},
  component: Caixa,
});

function Caixa() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const busca = Route.useSearch();
  const agora = hojeISO().slice(0, 7);

  /* O servidor sempre põe o mês atual primeiro: a busca dele sai junto
     com a lista de meses, e não uma depois da outra. */
  useEffect(() => { qc.prefetchQuery(leitura('listarCaixa', agora)); }, [qc, agora]);
  const meses = useQuery({ ...leitura<string[]>('mesesCaixa'), staleTime: 300_000 });

  const lista = meses.data || [];
  const idx = Math.max(0, busca.mes ? lista.indexOf(busca.mes) : 0);
  const mes = (busca.mes && lista.includes(busca.mes) ? busca.mes : lista[0]) || agora;
  const q = useQuery({ ...leitura<MesCaixa>('listarCaixa', mes), enabled: !!meses.data });
  const r = q.data;

  /* Trocar de mês troca a URL: voltar do detalhe ou do resumo cai no mesmo mês. */
  const irPara = (i: number) => {
    vibrar();
    navigate({ to: '/caixa', search: i === 0 ? {} : { mes: lista[i] }, replace: true });
  };

  const lancar = (tipo: 'Entrada' | 'Saída') => navigate({ to: '/caixa/lancar', search: { tipo } });

  return (
    <Tela
      titulo="Caixa"
      voltar="/"
      barra={
        <div className="flex gap-2">
          <button type="button" onClick={() => lancar('Entrada')}
            className="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-m bg-presente text-base font-bold text-white transition-colors duration-150 active:bg-presente-fundo">
            <Plus size={18} /> Entrou
          </button>
          <button type="button" onClick={() => lancar('Saída')}
            className="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-m bg-falta text-base font-bold text-white transition-colors duration-150 active:bg-falta-fundo">
            <Minus size={18} /> Saiu
          </button>
        </div>
      }
    >
      {meses.isError ? (
        <ErroTela erro={meses.error} tentar={() => meses.refetch()} />
      ) : !meses.data ? (
        <Esqueleto n={4} />
      ) : (
        <>
          <Passo
            rotulo={mesExtenso(mes)}
            antes={idx < lista.length - 1 ? () => irPara(idx + 1) : undefined}
            depois={idx > 0 ? () => irPara(idx - 1) : undefined}
          />
          {r ? <Mes r={r} /> : q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={3} />}
        </>
      )}
    </Tela>
  );
}

/* Mês anterior / próximo. */
function Passo({ rotulo, antes, depois }: { rotulo: string; antes?: () => void; depois?: () => void }) {
  const bt = 'grid size-11 shrink-0 place-items-center rounded-p text-roxo transition-colors duration-150 active:bg-roxo-fraco disabled:text-borda';
  return (
    <div className={clsx(CARTAO, 'mb-4 flex items-center justify-between gap-2 p-1')}>
      <button type="button" className={bt} onClick={antes} disabled={!antes} aria-label="Mês anterior"><ChevronLeft size={22} /></button>
      <b className="min-w-0 flex-1 truncate text-center text-base font-bold tracking-tight">{rotulo}</b>
      <button type="button" className={bt} onClick={depois} disabled={!depois} aria-label="Próximo mês"><ChevronRight size={22} /></button>
    </div>
  );
}

function Mes({ r }: { r: MesCaixa }) {
  const navigate = useNavigate();

  /* Lançamentos agrupados por dia, na ordem que o servidor mandou (mais novo primeiro). */
  const dias: { data: string; itens: Lancamento[] }[] = [];
  r.lancamentos.forEach((l) => {
    const ult = dias[dias.length - 1];
    if (ult && ult.data === l.data) ult.itens.push(l); else dias.push({ data: l.data, itens: [l] });
  });

  return (
    <>
      <div className="mb-2 rounded-m bg-roxo p-5 text-center text-white">
        <span className="block text-[13px] text-roxo-claro">em caixa</span>
        <b className="mt-1 block text-[32px] leading-tight font-bold tracking-tight tabular-nums [overflow-wrap:anywhere]">
          {reais(r.acumulado)}
        </b>
        <div className="mt-4 flex gap-2 border-t border-white/20 pt-4 text-[15px] font-semibold tabular-nums">
          <div className="min-w-0 flex-1 text-[#A8E6C6]">
            {reais(r.entrou)}<small className="mt-0.5 block text-xs font-normal text-roxo-claro">entrou no mês</small>
          </div>
          <div className="min-w-0 flex-1 text-[#F2B8C2]">
            {reais(r.saiu)}<small className="mt-0.5 block text-xs font-normal text-roxo-claro">saiu no mês</small>
          </div>
        </div>
      </div>

      {!r.lancamentos.length ? (
        <Estado icone={Wallet} titulo="Nada lançado neste mês"
          texto="Use os botões aqui embaixo assim que entrar ou sair dinheiro." />
      ) : (
        <>
          <Secao>{plural(r.lancamentos.length, 'lançamento', 'lançamentos')}</Secao>
          {dias.map((d) => (
            <div key={d.data}>
              <div className="mx-1 mt-4 mb-2 text-[13px] font-semibold text-apagado">{dataExtenso(d.data)}</div>
              <Lista semAvatar>
                {d.itens.map((l) => <ItemLanc key={l.linha} l={l} />)}
              </Lista>
            </div>
          ))}
          <button type="button" onClick={() => navigate({ to: '/caixa/resumo' })}
            className="mt-5 flex min-h-13 w-full items-center justify-center gap-2 rounded-m bg-roxo-fraco p-4 text-base font-bold text-roxo transition-colors duration-150 active:bg-roxo-claro">
            <FileText size={18} /> Resumo para prestação de contas
          </button>
        </>
      )}
    </>
  );
}

function ItemLanc({ l }: { l: Lancamento }) {
  const entrada = l.tipo === 'Entrada';
  const sub = (l.descricao || l.fonte || (entrada ? 'entrada' : 'saída')) +
    (l.comprovante ? ' · com nota' : entrada ? '' : ' · sem nota');
  return (
    <li role="button" tabIndex={0} onClick={() => verLanc(l)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); verLanc(l); } }}
      className={clsx('relative flex min-h-16 cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 ease-curva active:bg-roxo-fraco',
        'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4',
        'not-first:before:h-px not-first:before:bg-borda not-first:before:content-[""]')}>
      <span className="min-w-0 flex-1 text-base leading-tight font-semibold [overflow-wrap:anywhere]">
        {l.categoria}
        <small className="mt-0.5 block truncate text-[13px] font-normal text-apagado">{sub}</small>
      </span>
      <span className={clsx('shrink-0 text-base font-bold whitespace-nowrap tabular-nums', entrada ? 'text-presente' : 'text-falta')}>
        {entrada ? '+' : '−'} {reais(l.valor)}
      </span>
    </li>
  );
}

/* Detalhe do lançamento numa folha. Comprovante abre no Drive (só quem
   tem acesso ao Drive do instituto consegue ver: é documento financeiro). */
function verLanc(l: Lancamento) {
  const entrada = l.tipo === 'Entrada';
  const linhas: [string, string][] = [['Categoria', l.categoria], ['Quando', dataExtenso(l.data)]];
  if (l.descricao) linhas.push(['Descrição', l.descricao]);
  if (l.fonte) linhas.push(['Fonte', l.fonte]);
  if (l.quem) linhas.push(['Registrou', l.quem]);
  const url = urlSegura(l.comprovante);

  folha.abrir(entrada ? 'Entrada' : 'Saída', (fechar) => (
    <div className="px-2 pb-1">
      <div className={clsx('py-2 text-center text-[32px] font-bold tracking-tight tabular-nums', entrada ? 'text-presente' : 'text-falta')}>
        {entrada ? '+' : '−'} {reais(l.valor)}
      </div>
      <ul className={clsx(CARTAO, 'mt-4 overflow-hidden')}>
        {linhas.map(([k, v]) => (
          <li key={k} className="flex min-h-13 items-center gap-3 px-4 py-3 not-first:border-t not-first:border-borda">
            <span className="shrink-0 text-[15px] font-semibold">{k}</span>
            <span className="min-w-0 flex-1 text-right text-sm font-semibold text-apagado [overflow-wrap:anywhere]">{v}</span>
          </li>
        ))}
      </ul>
      {url ? (
        <a href={url} target="_blank" rel="noopener"
          className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-m bg-roxo p-4 text-base font-bold text-white active:bg-roxo-fundo">
          <ExternalLink size={18} /> Ver o comprovante
        </a>
      ) : !entrada && (
        <p className="mx-1 mt-4 text-[13px] leading-normal text-apagado">
          Sem comprovante. Prestação de contas costuma recusar despesa sem nota.
        </p>
      )}
      <button type="button" onClick={() => { fechar(); setTimeout(() => apagar(l), 80); }}
        className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-m border border-dashed border-[#EDC6CE] bg-fundo p-3.5 text-base font-bold text-falta active:bg-borda">
        <Trash2 size={18} /> Apagar lançamento
      </button>
    </div>
  ));
}

function apagar(l: Lancamento) {
  folha.confirmar('Apagar lançamento', 'Some da planilha e do saldo. Use só para corrigir digitação.', 'Apagar', async () => {
    try {
      /* O valor vai junto: se alguém lançou nesse meio-tempo as linhas
         andaram, e o servidor recusa em vez de apagar a errada. */
      await escrever('apagarLancamento', [l.linha, l.valor]);
      vibrar(); toast('Lançamento apagado');
    } catch (e) {
      toast(textoErro(e), 'erro');
    }
  });
}
