/* Resumo do período para a prestação de contas: totais por categoria e
   por fonte, aviso de saída sem nota e um botão que copia tudo em texto. */
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Copy, FileText, ReceiptText } from 'lucide-react';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Banner, BotaoCheio, Campo, Esqueleto, Lista, Secao } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { toast } from '../../../ui/toast';
import { copiarTexto, dataCurta, hojeISO, plural, reais, vibrar } from '../../../util';
import type { ResumoCaixa } from './-tipos';

export const Route = createFileRoute('/_app/caixa/resumo')({ component: Resumo });

function Resumo() {
  const fimPadrao = hojeISO();
  const [ini, setIni] = useState(fimPadrao.slice(0, 8) + '01');
  const [fim, setFim] = useState(fimPadrao);
  /* O período só vale quando a pessoa toca em Gerar: mexer na data não
     dispara uma busca a cada dígito. Abre já gerado, como no app HTML. */
  const [periodo, setPeriodo] = useState({ ini, fim });
  const [erro, setErro] = useState<{ campo: 'ini' | 'fim'; msg: string } | null>(null);
  const q = useQuery(leitura<ResumoCaixa>('resumoCaixa', periodo.ini, periodo.fim));

  function gerar() {
    if (!ini) { setErro({ campo: 'ini', msg: 'Escolha o primeiro dia.' }); document.getElementById('cxIni')?.focus(); return; }
    if (!fim) { setErro({ campo: 'fim', msg: 'Escolha o último dia.' }); document.getElementById('cxFim')?.focus(); return; }
    if (ini > fim) { setErro({ campo: 'fim', msg: 'O último dia vem antes do primeiro. Troque as datas.' }); document.getElementById('cxFim')?.focus(); return; }
    setErro(null);
    setPeriodo({ ini, fim });
    if (ini === periodo.ini && fim === periodo.fim) q.refetch();
  }

  return (
    <Tela titulo="Resumo do caixa" voltar="/caixa">
      <p className="mx-1 mb-4 text-sm text-apagado">Totais por categoria e por fonte, para colar na prestação de contas.</p>
      {/* Lado a lado enquanto couber, um embaixo do outro em tela estreita. */}
      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-2">
        <Campo id="cxIni" rotulo="De" type="date" value={ini} className="!mb-0 min-w-0 flex-[1_1_140px]"
          erro={erro?.campo === 'ini' ? erro.msg : undefined}
          onChange={(e) => { setIni(e.target.value); setErro(null); }} />
        <Campo id="cxFim" rotulo="Até" type="date" value={fim} className="!mb-0 min-w-0 flex-[1_1_140px]"
          erro={erro?.campo === 'fim' ? erro.msg : undefined}
          onChange={(e) => { setFim(e.target.value); setErro(null); }} />
      </div>
      <BotaoCheio icone={FileText} onClick={gerar} carregando={q.isFetching}>
        {q.isFetching ? 'Somando…' : 'Gerar resumo'}
      </BotaoCheio>

      <div className="mt-1">
        {q.data ? <Resultado r={q.data} />
          : q.isError ? <div className="mt-5"><ErroTela titulo="Não deu para gerar" erro={q.error} tentar={() => q.refetch()} /></div>
            : <div className="mt-5"><Esqueleto n={2} /></div>}
      </div>
    </Tela>
  );
}

const semRS = (v: number) => reais(v).replace('R$ ', '');

function Resultado({ r }: { r: ResumoCaixa }) {
  async function copiar() {
    const L = ['INSTITUTO VERIDIANA — Movimentação financeira',
      'Período: ' + dataCurta(r.inicio) + '/' + r.inicio.slice(0, 4) + ' a ' + dataCurta(r.fim) + '/' + r.fim.slice(0, 4), '',
      'Entradas: ' + reais(r.entrou),
      'Saídas:   ' + reais(r.saiu),
      'Saldo:    ' + reais(r.saldo),
      'Lançamentos: ' + r.lancamentos, ''];
    if (r.entradas.length) { L.push('Entradas por categoria:'); r.entradas.forEach((x) => L.push('- ' + x.nome + ': ' + reais(x.valor))); L.push(''); }
    if (r.saidas.length) { L.push('Saídas por categoria:'); r.saidas.forEach((x) => L.push('- ' + x.nome + ': ' + reais(x.valor))); L.push(''); }
    if (r.fontes.length) { L.push('Por fonte:'); r.fontes.forEach((f) => L.push('- ' + f.fonte + ': entrou ' + reais(f.entrou) + ', saiu ' + reais(f.saiu))); }
    if (await copiarTexto(L.join('\n'))) { vibrar(); toast('Resumo copiado'); }
    else toast('Não deu para copiar sozinho. Segure o dedo no texto.', 'erro');
  }

  /* Período vazio: três "0,00" não dizem nada. Só o aviso. */
  if (r.lancamentos === 0) {
    return (
      <Banner tom="info" titulo="Nada lançado nesse período" className="mt-5">
        Confira as datas De e Até. Se o dinheiro entrou ou saiu e não aparece aqui, lance pela tela do Caixa.
      </Banner>
    );
  }

  return (
    <>
      <Secao>Resumo</Secao>
      {/* Três números lado a lado: em 360 px cabem até "99.999,99" sem quebrar. */}
      <div className="flex gap-2">
        {[
          { n: semRS(r.entrou), txt: 'entrou', cor: 'bg-presente' },
          { n: semRS(r.saiu), txt: 'saiu', cor: 'bg-falta' },
          { n: semRS(r.saldo), txt: 'saldo', cor: 'bg-roxo' },
        ].map((x) => (
          <div key={x.txt} className={'min-w-0 flex-1 rounded-m px-1.5 py-4 text-center text-white ' + x.cor}>
            <b className="block text-[clamp(15px,4.6vw,24px)] leading-tight font-bold tracking-tight tabular-nums [overflow-wrap:anywhere]">{x.n}</b>
            <span className="mt-1 block text-xs text-white/90">{x.txt}</span>
          </div>
        ))}
      </div>

      <Bloco titulo="Entradas por categoria" itens={r.entradas} />
      <Bloco titulo="Saídas por categoria" itens={r.saidas} />

      {r.fontes.length > 0 && (
        <>
          <Secao>Por fonte</Secao>
          <Lista semAvatar>
            {r.fontes.map((f) => (
              <LinhaValor key={f.fonte} nome={f.fonte} sub={'entrou ' + reais(f.entrou) + ' · saiu ' + reais(f.saiu)} valor={f.entrou - f.saiu} />
            ))}
          </Lista>
        </>
      )}

      {r.semComprovante > 0 && (
        <Banner tom="atencao" icone={ReceiptText} className="mt-4"
          titulo={plural(r.semComprovante, 'saída sem nota', 'saídas sem nota')}>
          A prestação de contas costuma recusar despesa sem comprovante. Junte as notas antes de enviar.
        </Banner>
      )}
      <BotaoCheio icone={Copy} onClick={copiar} className="mt-5">Copiar para colar no relatório</BotaoCheio>
    </>
  );
}

function Bloco({ titulo, itens }: { titulo: string; itens: { nome: string; valor: number }[] }) {
  if (!itens.length) return null;
  return (
    <>
      <Secao>{titulo}</Secao>
      <Lista semAvatar>{itens.map((x) => <LinhaValor key={x.nome} nome={x.nome} valor={x.valor} />)}</Lista>
    </>
  );
}

function LinhaValor({ nome, sub, valor }: { nome: string; sub?: string; valor: number }) {
  return (
    <li className="relative flex min-h-16 items-center gap-3 px-4 py-3 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4 not-first:before:h-px not-first:before:bg-borda not-first:before:content-['']">
      <span className="min-w-0 flex-1 text-base leading-tight font-semibold [overflow-wrap:anywhere]">
        {nome}
        {sub && <small className="mt-0.5 block text-[13px] font-normal text-apagado">{sub}</small>}
      </span>
      <span className="shrink-0 text-[15px] font-bold whitespace-nowrap text-apagado tabular-nums">{reais(valor)}</span>
    </li>
  );
}
