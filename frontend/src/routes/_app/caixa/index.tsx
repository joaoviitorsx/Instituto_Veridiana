/* Fluxo de caixa: o mês. Lançar em poucos toques, do celular, entre uma
   aula e outra. Tela raiz com o DNA do Início (DESIGN.md §16): Heroi com o
   mês, o saldo num cartão por cima da borda. Entrou/Saiu ficam nos dois
   botões grandes, verde e vermelho, fixos embaixo: cor, sinal e palavra
   dizem o sentido de longe, e o polegar não precisa procurar. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, FileText, Minus, Plus, ReceiptText, Trash2,
  TriangleAlert, Wallet,
} from 'lucide-react';
import { clsx } from 'clsx';
import { escrever, leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Banner, CARTAO, Esqueleto, Estado, GrupoNav, Osso } from '../../../ui/kit';
import { CabecalhoSecao, CARTAO_ELEVADO, Corpo, Heroi, Sobreposto } from '../../../ui/Heroi';
import { ErroTela } from '../../../ui/ErroTela';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { dataExtenso, hojeISO, maiuscula, MESES, plural, reais, textoErro, urlSegura, vibrar } from '../../../util';
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
  const antes = idx < lista.length - 1 ? () => irPara(idx + 1) : undefined;
  const depois = idx > 0 ? () => irPara(idx - 1) : undefined;

  const semNota = r ? r.lancamentos.filter((l) => l.tipo === 'Saída' && !l.comprovante).length : 0;
  const mesNome = maiuscula(MESES[+mes.slice(5, 7) - 1]);

  return (
    <Tela titulo={mesNome} voltar="/" roxo solto
      barra={
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate({ to: '/caixa/lancar', search: { tipo: 'Entrada' } })}
            className="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-m bg-presente text-base font-bold text-white transition-colors duration-150 active:bg-presente-fundo">
            <Plus size={18} /> Entrou
          </button>
          <button type="button" onClick={() => navigate({ to: '/caixa/lancar', search: { tipo: 'Saída' } })}
            className="flex min-h-13 flex-1 items-center justify-center gap-2 rounded-m bg-falta text-base font-bold text-white transition-colors duration-150 active:bg-falta-fundo">
            <Minus size={18} /> Saiu
          </button>
        </div>
      }
      capa={
        /* Regra do Heroi (DESIGN §16): sobretítulo = contexto, título = o
           foco, e o título que encolhe na barra é o mesmo. Só o mês: "Outubro
           de 2026" enchia os 360px. */
        <Heroi sobre={'Caixa · ' + mes.slice(0, 4)} titulo={mesNome}
          pilulas={[
            /* Mês vazio: o vazio já é dito no Estado lá embaixo, uma vez só. */
            r && r.lancamentos.length > 0 && { icone: ReceiptText, texto: plural(r.lancamentos.length, 'lançamento', 'lançamentos') },
            r && semNota > 0 && { icone: TriangleAlert, texto: plural(semNota, 'saída sem nota', 'saídas sem nota') },
          ]} />
      }>
      <Sobreposto>
        {meses.isError ? (
          <div className={CARTAO_ELEVADO}><ErroTela erro={meses.error} tentar={() => meses.refetch()} /></div>
        ) : r ? (
          <Saldo r={r} antes={antes} depois={depois} />
        ) : q.isError ? (
          <div className={CARTAO_ELEVADO}><ErroTela erro={q.error} tentar={() => q.refetch()} /></div>
        ) : (
          <Osso className="h-44 rounded-2xl shadow-cartao" />
        )}
      </Sobreposto>
      <Corpo>
        <GrupoNav className="mt-1" itens={[{ icone: FileText, titulo: 'Resumo do período', sub: 'por categoria e por fonte, para a prestação de contas',
          onClick: () => navigate({ to: '/caixa/resumo' }) }]} />
        {r ? <Lancamentos r={r} /> : !q.isError && !meses.isError && <Esqueleto n={3} />}
      </Corpo>
    </Tela>
  );
}

/* O cartão principal: quanto há em caixa no fim do mês da tela, o que
   entrou e saiu nele, e o passo de mês nos cantos. Branco elevado sobre o
   roxo do Heroi (o bloco roxo antigo ficaria roxo sobre roxo). */
function Saldo({ r, antes, depois }: { r: MesCaixa; antes?: () => void; depois?: () => void }) {
  const bt = 'grid size-11 shrink-0 place-items-center rounded-full text-roxo transition-colors duration-150 active:bg-roxo-fraco disabled:text-borda';
  return (
    <div className={clsx(CARTAO_ELEVADO, 'p-2 pb-4')}>
      <div className="flex items-center justify-between">
        <button type="button" className={bt} onClick={antes} disabled={!antes} aria-label="Mês anterior"><ChevronLeft size={22} /></button>
        <span className="text-xs font-bold tracking-[.06em] text-roxo uppercase">Em caixa</span>
        <button type="button" className={bt} onClick={depois} disabled={!depois} aria-label="Próximo mês"><ChevronRight size={22} /></button>
      </div>
      <b className="-mt-1 block px-2 text-center text-[34px] leading-tight font-extrabold tracking-tight tabular-nums [overflow-wrap:anywhere]">
        {reais(r.acumulado)}
      </b>
      <div className="mx-2 mt-3 flex gap-2 border-t border-borda pt-3">
        <Movimento tipo="entrada" valor={r.entrou} rotulo="entrou no mês" />
        <Movimento tipo="saida" valor={r.saiu} rotulo="saiu no mês" />
      </div>
    </div>
  );
}

function Movimento({ tipo, valor, rotulo }: { tipo: 'entrada' | 'saida'; valor: number; rotulo: string }) {
  const entrada = tipo === 'entrada';
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className={clsx('grid size-8 shrink-0 place-items-center rounded-full', entrada ? 'bg-presente-fraco text-presente' : 'bg-falta-fraco text-falta')}>
        {entrada ? <ArrowDownLeft size={17} strokeWidth={2.5} /> : <ArrowUpRight size={17} strokeWidth={2.5} />}
      </span>
      <span className="min-w-0 leading-tight">
        <b className={clsx('block truncate text-[15px] tabular-nums', entrada ? 'text-presente' : 'text-falta')}>{reais(valor)}</b>
        <small className="block text-xs text-apagado">{rotulo}</small>
      </span>
    </div>
  );
}

function Lancamentos({ r }: { r: MesCaixa }) {
  /* Agrupados por dia, na ordem que o servidor mandou (mais novo primeiro). */
  const dias: { data: string; itens: Lancamento[] }[] = [];
  r.lancamentos.forEach((l) => {
    const ult = dias[dias.length - 1];
    if (ult && ult.data === l.data) ult.itens.push(l); else dias.push({ data: l.data, itens: [l] });
  });

  if (!r.lancamentos.length) {
    return (
      <Estado icone={Wallet} titulo="Nada lançado neste mês"
        texto="Assim que entrar ou sair dinheiro, toque em Entrou ou Saiu, aqui embaixo." />
    );
  }
  return (
    <>
      <CabecalhoSecao titulo={plural(r.lancamentos.length, 'lançamento', 'lançamentos')} />
      {dias.map((d) => (
        <section key={d.data} className="mb-3">
          <div className="mb-1.5 pl-4 text-[13px] font-semibold text-apagado">{maiuscula(dataExtenso(d.data))}</div>
          <ul className={clsx(CARTAO, 'overflow-hidden')}>
            {d.itens.map((l) => <ItemLanc key={l.linha} l={l} />)}
          </ul>
        </section>
      ))}
    </>
  );
}

/* Linha no padrão do Início: coluna fixa à esquerda (o sentido, em ícone
   e cor), categoria e descrição no meio, valor com sinal à direita e o
   selo "sem nota" escrito embaixo dele. */
function ItemLanc({ l }: { l: Lancamento }) {
  const entrada = l.tipo === 'Entrada';
  const semNota = !entrada && !l.comprovante;
  const sub = l.descricao || l.fonte || (entrada ? 'entrada' : 'saída');
  return (
    <li role="button" tabIndex={0} onClick={() => verLanc(l)}
      aria-label={(entrada ? 'Entrou ' : 'Saiu ') + reais(l.valor) + ', ' + l.categoria + (semNota ? ', sem nota' : '')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); verLanc(l); } }}
      className={clsx('relative flex min-h-16 cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors duration-150 ease-curva active:bg-roxo-fraco/60',
        'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-[68px]',
        'not-first:before:h-px not-first:before:bg-borda not-first:before:content-[""]')}>
      <span className={clsx('grid size-10 shrink-0 place-items-center rounded-xl', entrada ? 'bg-presente-fraco text-presente' : 'bg-falta-fraco text-falta')}>
        {entrada ? <ArrowDownLeft size={20} strokeWidth={2.4} /> : <ArrowUpRight size={20} strokeWidth={2.4} />}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <b className="block text-base font-semibold [overflow-wrap:anywhere]">{l.categoria}</b>
        <small className="mt-0.5 block truncate text-[13px] text-apagado">{sub}</small>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={clsx('text-base font-bold whitespace-nowrap tabular-nums', entrada ? 'text-presente' : 'text-falta')}>
          {entrada ? '+' : '−'} {reais(l.valor)}
        </span>
        {semNota && (
          <span className="rounded-full bg-justif-fraco px-2 py-0.5 text-xs font-bold text-justif-tinta">sem nota</span>
        )}
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
        <Banner tom="atencao" titulo="Saída sem nota" className="mt-4 mb-0">
          A prestação de contas costuma recusar despesa sem comprovante. Se a nota aparecer, lance de novo com a foto.
        </Banner>
      )}
      <button type="button" onClick={() => { fechar(); setTimeout(() => apagar(l), 80); }}
        className="mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-m border border-falta/30 bg-papel p-3.5 text-base font-bold text-falta active:bg-falta-fraco">
        <Trash2 size={18} /> Apagar lançamento
      </button>
    </div>
  ));
}

function apagar(l: Lancamento) {
  folha.confirmar('Apagar este lançamento?', reais(l.valor) + ' de ' + l.categoria + ' sai da planilha e do saldo. Use só para corrigir algo digitado errado.', 'Apagar', async () => {
    try {
      /* O valor vai junto: se alguém lançou nesse meio-tempo as linhas
         andaram, e o servidor recusa em vez de apagar a errada. */
      await escrever('apagarLancamento', [l.linha, l.valor]);
      vibrar(); toast('Lançamento apagado');
    } catch (e) {
      toast('Não deu para apagar. ' + textoErro(e), 'erro');
    }
  });
}
