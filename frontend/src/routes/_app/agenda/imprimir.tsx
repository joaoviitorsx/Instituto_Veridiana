/* Calendário para imprimir. Fecha o ciclo: a coordenação imprime e
   escreve em cima, como sempre fez. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, FileText, MessageCircle, Printer } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura, useEscrita } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Banner, BotaoCheio } from '../../../ui/kit';
import { CARTAO_ELEVADO } from '../../../ui/Heroi';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { copiarTexto, plural, textoErro, urlSegura, vibrar } from '../../../util';
import { anoDeHoje, anoValido, Passo, type AgendaAno } from './-comum';

type Pdf = { url: string; nome: string; publico: boolean; paginas: number; eventos: number; tempo?: { total: number } };

export const Route = createFileRoute('/_app/agenda/imprimir')({
  validateSearch: (s: Record<string, unknown>): { ano?: number } => {
    const ano = anoValido(s.ano);
    return ano ? { ano } : {};
  },
  component: Imprimir,
});

function Imprimir() {
  const ano = Route.useSearch().ano || anoDeHoje();
  const navigate = useNavigate();
  const conta = useQuery(leitura<AgendaAno>('listarAgendaAno', ano));
  /* O Drive leva seus segundos (às vezes um minuto). */
  const gerar = useEscrita<Pdf>('gerarCalendarioPdf', { prazo: 150_000 });
  const [segundos, setSegundos] = useState(0);
  const inicio = useRef(0);

  /* "Gerando…" parado por 40 segundos é igual a travado. O contador anda
     a cada segundo e o texto muda conforme a espera cresce. Não finge
     progresso: o servidor não conta em que página está, só o relógio. */
  useEffect(() => {
    if (!gerar.isPending) return;
    const t = setInterval(() => setSegundos(Math.round((Date.now() - inicio.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [gerar.isPending]);

  const passo = (n: number) => {
    if (gerar.isPending) return;
    vibrar(); gerar.reset();
    navigate({ to: '/agenda/imprimir', search: { ano: ano + n }, replace: true });
  };

  function pedir() {
    inicio.current = Date.now();
    setSegundos(0);
    gerar.mutate([ano], {
      onSuccess: (r) => { vibrar(); mostrarPronto(ano, r, Math.round((Date.now() - inicio.current) / 1000)); },
      onError: (e) => toast(textoErro(e), 'erro'),
    });
  }

  const espera = segundos < 20 ? 'Montando as páginas do calendário no Google'
    : segundos < 60 ? 'Ainda montando. O Google leva seu tempo com PDF; pode deixar a tela aberta'
      : 'Está demorando mais que o normal, mas continua trabalhando';

  return (
    <Tela titulo="Calendário para imprimir" voltar="/agenda">
      <Passo rotulo={ano} onAnterior={() => passo(-1)} onProximo={() => passo(1)}
        nomeAnterior="Ano anterior" nomeProximo="Próximo ano" />
      <div className={clsx(CARTAO_ELEVADO, 'mb-3 p-5 text-center text-roxo')}>
        <Printer size={26} className="mx-auto" />
        <b className="mt-3 mb-1 block text-[17px] font-bold text-tinta">Calendário {ano}</b>
        <span className="block text-sm leading-normal text-apagado">
          Folha A4 deitada, uma página por trimestre, com os eventos marcados em cada dia e espaço em branco
          para escrever à mão. Mês com muito evento ganha página própria.
        </span>
        {conta.data && (
          <span className="mt-2 block text-sm font-semibold text-roxo">
            {conta.data.total ? plural(conta.data.total, 'evento marcado', 'eventos marcados') + ' no ano'
              : 'Nenhum evento ainda: sai o calendário em branco.'}
          </span>
        )}
      </div>
      <BotaoCheio icone={FileText} onClick={pedir} carregando={gerar.isPending}>
        {gerar.isPending ? 'Gerando o calendário…' : gerar.isSuccess ? 'Gerar de novo' : 'Gerar o PDF'}
      </BotaoCheio>
      <p role="status" aria-live="polite" className="mt-2 min-h-[3em] text-center text-[13px] leading-normal text-apagado">
        {gerar.isPending ? espera + ' · ' + segundos + ' s' : ''}
      </p>
      {gerar.data && !gerar.isPending && (
        <button type="button" onClick={() => mostrarPronto(ano, gerar.data!, gerar.data!.tempo?.total ?? 0)}
          className="mx-auto block min-h-11 px-4 text-sm font-semibold text-roxo underline">
          Ver o último calendário gerado
        </button>
      )}
    </Tela>
  );
}

function mostrarPronto(ano: number, r: Pdf, medido: number) {
  const url = urlSegura(r.url);
  const seg = r.tempo ? r.tempo.total : medido;
  const texto = 'Calendário ' + ano + ' do Instituto Veridiana: ' + url;
  const link = 'flex min-h-13 w-full items-center justify-center gap-2 rounded-m p-4 text-base font-bold';
  folha.abrir('Calendário pronto', (
    <>
      <p className="mx-2 mb-3 text-sm text-apagado">
        {r.nome} · {plural(r.paginas, 'página', 'páginas')} · pronto em {String(seg).replace('.', ',')} s
      </p>
      <div className="grid gap-2 px-2">
        <a className={clsx(link, 'bg-roxo text-white active:bg-roxo-fundo')} href={url} target="_blank" rel="noopener">
          <ExternalLink size={18} /> Abrir o PDF
        </a>
        {r.publico && (
          <a className={clsx(link, 'bg-presente text-white active:bg-presente-fundo')}
            href={'https://wa.me/?text=' + encodeURIComponent(texto)} target="_blank" rel="noopener">
            <MessageCircle size={18} /> Mandar no WhatsApp
          </a>
        )}
        <button type="button" className={clsx(link, 'bg-fundo text-roxo active:bg-borda')}
          onClick={async () => { if (await copiarTexto(url)) { vibrar(); toast('Link copiado'); } else toast('Não deu para copiar sozinho. Segure o dedo no link para copiar.', 'info'); }}>
          <Copy size={18} /> Copiar link
        </button>
        {!r.publico && (
          <Banner tom="atencao" titulo="Link só para quem tem acesso" className="mt-2 mb-0">
            O Drive do instituto não deixou abrir o link para qualquer pessoa. Quem receber precisa ter acesso à
            pasta "Agenda — Instituto Veridiana".
          </Banner>
        )}
      </div>
    </>
  ));
}
