/* Resumo do período para a prestação de contas: totais por categoria e
   por fonte, aviso de saída sem nota e um botão que copia tudo em texto. */
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, Copy, FileText, ReceiptText } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Banner, BotaoCheio, CARTAO, Campo, Esqueleto, Estado } from '../../../ui/kit';
import { CabecalhoSecao, CARTAO_ELEVADO } from '../../../ui/Heroi';
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
        {/* Com o ícone, a data não cabe pela metade de 360px: o par empilha no
            celular e fica lado a lado só onde couber (180px cada). */}
        <Campo id="cxIni" rotulo="De" type="date" icone={Calendar} value={ini} className="mb-0! min-w-0 flex-[1_1_180px]"
          erro={erro?.campo === 'ini' ? erro.msg : undefined}
          onChange={(e) => { setIni(e.target.value); setErro(null); }} />
        <Campo id="cxFim" rotulo="Até" type="date" icone={Calendar} value={fim} className="mb-0! min-w-0 flex-[1_1_180px]"
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

  /* Período vazio: três "0,00" não dizem nada. O vazio tem a mesma cara
     do resto do app (Estado), não um aviso. */
  if (r.lancamentos === 0) {
    return (
      <Estado icone={ReceiptText} titulo="Nada lançado nesse período"
        texto="Confira as datas De e Até. Se o dinheiro entrou ou saiu e não aparece aqui, lance pela tela do Caixa." />
    );
  }

  return (
    <>
      <CabecalhoSecao titulo="Resumo" className="mt-4" />
      {/* O cartão principal, como o saldo da tela do Caixa: o saldo grande,
          entrou e saiu embaixo com sinal e cor (e o rótulo escrito). */}
      <div className={clsx(CARTAO_ELEVADO, 'p-4')}>
        <span className="block text-center text-xs font-bold tracking-[.06em] text-roxo uppercase">Saldo do período</span>
        <b className={clsx('mt-1 block text-center text-[32px] leading-tight font-extrabold tracking-tight tabular-nums [overflow-wrap:anywhere]',
          r.saldo < 0 && 'text-falta')}>{reais(r.saldo)}</b>
        <span className="mt-0.5 block text-center text-[13px] text-apagado">{plural(r.lancamentos, 'lançamento', 'lançamentos')}</span>
        <div className="mt-3 flex gap-2 border-t border-borda pt-3">
          <Total tipo="entrada" valor={r.entrou} />
          <Total tipo="saida" valor={r.saiu} />
        </div>
      </div>

      <Bloco titulo="Entradas por categoria" itens={r.entradas} tipo="entrada" />
      <Bloco titulo="Saídas por categoria" itens={r.saidas} tipo="saida" />

      {r.fontes.length > 0 && (
        <>
          <CabecalhoSecao titulo="Por fonte" className="mt-4" />
          <ul className={clsx(CARTAO, 'overflow-hidden')}>
            {r.fontes.map((f) => (
              <LinhaValor key={f.fonte} nome={f.fonte} sub={'entrou ' + reais(f.entrou) + ' · saiu ' + reais(f.saiu)}
                valor={f.entrou - f.saiu} tipo={f.entrou - f.saiu >= 0 ? 'entrada' : 'saida'} saldo />
            ))}
          </ul>
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

function Total({ tipo, valor }: { tipo: 'entrada' | 'saida'; valor: number }) {
  const entrada = tipo === 'entrada';
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className={clsx('grid size-8 shrink-0 place-items-center rounded-full', entrada ? 'bg-presente-fraco text-presente' : 'bg-falta-fraco text-falta')}>
        {entrada ? <ArrowDownLeft size={17} strokeWidth={2.5} /> : <ArrowUpRight size={17} strokeWidth={2.5} />}
      </span>
      <span className="min-w-0 leading-tight">
        <b className={clsx('block truncate text-[15px] tabular-nums', entrada ? 'text-presente' : 'text-falta')}>{reais(valor)}</b>
        <small className="block text-xs text-apagado">{entrada ? 'entrou' : 'saiu'}</small>
      </span>
    </div>
  );
}

function Bloco({ titulo, itens, tipo }: { titulo: string; itens: { nome: string; valor: number }[]; tipo: 'entrada' | 'saida' }) {
  if (!itens.length) return null;
  return (
    <>
      <CabecalhoSecao titulo={titulo} className="mt-4" />
      <ul className={clsx(CARTAO, 'overflow-hidden')}>{itens.map((x) => <LinhaValor key={x.nome} nome={x.nome} valor={x.valor} tipo={tipo} />)}</ul>
    </>
  );
}

/* Linha com o valor à direita, com sinal e cor do sentido. Em "Por fonte"
   o valor é o saldo daquela fonte. */
function LinhaValor({ nome, sub, valor, tipo, saldo }: { nome: string; sub?: string; valor: number; tipo: 'entrada' | 'saida'; saldo?: boolean }) {
  const entrada = tipo === 'entrada';
  const sinal = saldo ? (valor < 0 ? '−' : '+') : entrada ? '+' : '−';
  return (
    <li className="relative flex min-h-14 items-center gap-3 px-4 py-3 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-4 not-first:before:h-px not-first:before:bg-borda not-first:before:content-['']">
      <span className="min-w-0 flex-1 text-base leading-tight font-semibold [overflow-wrap:anywhere]">
        {nome}
        {sub && <small className="mt-0.5 block text-[13px] font-normal text-apagado">{sub}</small>}
      </span>
      <span className={clsx('shrink-0 text-[15px] font-bold whitespace-nowrap tabular-nums', entrada ? 'text-presente' : 'text-falta')}>
        {sinal} {reais(Math.abs(valor))}
      </span>
    </li>
  );
}
