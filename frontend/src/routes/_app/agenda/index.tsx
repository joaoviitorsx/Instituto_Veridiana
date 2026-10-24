/* Agenda anual, vista mês a mês. Não substitui o calendário de papel da
   coordenação: alimenta ele. O fim da linha é o PDF para imprimir. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  Cake, Calendar, CalendarCheck, CalendarClock, Check, ChevronLeft, ChevronRight, Clock, FileText, MapPin, Pencil, Plus,
  Printer, Table, Trash2, Users,
} from 'lucide-react';
import { clsx } from 'clsx';
import { escrever, leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { CARTAO, Esqueleto, Estado } from '../../../ui/kit';
import { Atalhos, BotaoHeroi, CabecalhoSecao, CARTAO_ELEVADO, Corpo, Heroi, Sobreposto } from '../../../ui/Heroi';
import { ErroTela } from '../../../ui/ErroTela';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { dataCurta, dataExtenso, hojeISO, maiuscula, MESES, mesExtenso, plural, textoErro, vibrar } from '../../../util';
import {
  corTipo, diaSemanaIso, MES_CURTO, mesDeHoje, mesValido, somarMes, Tag, textoTurmas,
  type AgendaMes, type Evento,
} from './-comum';

export const Route = createFileRoute('/_app/agenda/')({
  validateSearch: (s: Record<string, unknown>): { mes?: string } => {
    const mes = mesValido(s.mes);
    return mes ? { mes } : {};
  },
  component: Agenda,
});

const argsMes = (mes: string) => [+mes.slice(0, 4), +mes.slice(5, 7)] as const;

function Agenda() {
  const busca = Route.useSearch();
  const mes = busca.mes || mesDeHoje();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery(leitura<AgendaMes>('listarAgenda', ...argsMes(mes)));
  const r = q.data;

  /* Quem olha um mês costuma passar para o lado: os vizinhos já vêm. */
  useEffect(() => {
    if (!r) return;
    [-1, 1].forEach((n) => qc.prefetchQuery(leitura('listarAgenda', ...argsMes(somarMes(mes, n)))));
  }, [r, mes, qc]);

  const irMes = (n: number) => { vibrar(); navigate({ to: '/agenda', search: { mes: somarMes(mes, n) }, replace: true }); };
  /* No mês de hoje, a data já vem hoje. Em outro mês, o dia 1 dele:
     quem navegou até abril quer marcar algo em abril. */
  const novo = () => navigate({ to: '/agenda/evento', search: { data: mes === mesDeHoje() ? hojeISO() : mes + '-01' } });
  const ano = +mes.slice(0, 4);
  const noMesDeHoje = mes === mesDeHoje();
  const mesNome = maiuscula(MESES[+mes.slice(5, 7) - 1]);

  /* O próximo evento do mês que ainda não terminou e não foi cancelado:
     é o que a coordenação quer saber de relance. */
  const hj = r?.hoje || hojeISO();
  const validos = r ? r.eventos.filter((ev) => ev.status !== 'Cancelado') : [];
  const proximo = validos.find((ev) => (ev.dataFim || ev.data) >= hj) || null;

  return (
    <Tela titulo={mesNome} roxo solto
      fab={{ icone: Plus, texto: 'Novo evento', onClick: novo }}
      capa={
        /* Regra do Heroi (DESIGN §16): sobretítulo = contexto, título = o
           foco, e o título que encolhe na barra é o mesmo. Só o mês no
           título: "Novembro de 2026" quebrava em 360px. */
        <Heroi sobre={'Agenda · ' + ano} titulo={mesNome}
          direita={!noMesDeHoje && (
            <BotaoHeroi rotulo="Voltar para o mês de hoje"
              onClick={() => { vibrar(); navigate({ to: '/agenda', search: {}, replace: true }); }}>
              <CalendarCheck size={22} />
            </BotaoHeroi>
          )}
          pilulas={[
            r && { icone: Calendar, texto: validos.length ? plural(validos.length, 'evento no mês', 'eventos no mês') : 'Nada marcado no mês' },
            proximo && { icone: Clock, texto: 'próximo: ' + dataCurta(proximo.data) },
          ]} />
      }>
      <Sobreposto>
        <div className={clsx(CARTAO_ELEVADO, 'overflow-hidden')}>
          {/* Sem próximo, o cartão não fica só com o passo: diz como está o mês. */}
          {r && (proximo ? <Proximo ev={proximo} r={r} mes={mes} /> : <ResumoMes validos={validos} mes={mes} r={r} onNovo={novo} />)}
          <PassoMes mes={mes} onAnterior={() => irMes(-1)} onProximo={() => irMes(1)} comBorda={!!r} />
        </div>
      </Sobreposto>

      <Corpo>
        <Atalhos itens={[
          { icone: Table, texto: 'Ver o ano', onClick: () => navigate({ to: '/agenda/ano', search: { ano } }) },
          { icone: Printer, texto: 'Imprimir', onClick: () => navigate({ to: '/agenda/imprimir', search: { ano } }) },
          { icone: CalendarClock, texto: 'Grade de aulas', onClick: () => navigate({ to: '/grade' }) },
          { icone: Cake, texto: 'Datas do ano', onClick: () => navigate({ to: '/agenda/datas', search: { ano } }) },
        ]} />

        {r ? (
          r.eventos.length ? (
            <>
              <CabecalhoSecao titulo={'Eventos de ' + MESES[+mes.slice(5, 7) - 1]} />
              <ul className={clsx(CARTAO, 'overflow-hidden')}>
                {r.eventos.map((ev) => (
                  <LinhaEvento key={ev.id || ev.titulo + ev.data} ev={ev} mes={mes} r={r} destaque={!!proximo && ev === proximo} />
                ))}
              </ul>
            </>
          ) : (
            <Estado icone={Calendar} titulo={'Nada marcado em ' + MESES[+mes.slice(5, 7) - 1]}
              texto="Coloque aqui ensaios, apresentações, reuniões e datas do instituto."
              botao={{ txt: 'Marcar o primeiro evento', fn: novo }} />
          )
        ) : q.isError ? (
          <ErroTela erro={q.error} tentar={() => q.refetch()} />
        ) : (
          <Esqueleto n={3} />
        )}
      </Corpo>
    </Tela>
  );
}

/* Topo do cartão elevado: o próximo evento, no mesmo jeito do "Aula
   agora" do Início — rótulo pequeno, título grande, uma linha de apoio. */
function Proximo({ ev, r, mes }: { ev: Evento; r: AgendaMes; mes: string }) {
  const navigate = useNavigate();
  const editar = () => navigate({ to: '/agenda/evento', search: { id: ev.id, mes: ev.data.slice(0, 7) } });
  const hoje = ev.data <= r.hoje && (ev.dataFim || ev.data) >= r.hoje;
  const sub = [hoje ? '' : maiuscula(dataExtenso(ev.data)), ev.local || textoTurmas(ev.turmas)].filter(Boolean).join(' · ');
  return (
    <button type="button" onClick={() => verEvento(ev, r, editar)}
      className="flex min-h-21 w-full items-center gap-3 p-4 text-left transition-colors duration-150 active:bg-fundo">
      <DiaBloco iso={ev.data} desde={ev.data.slice(0, 7) < mes} forte />
      <span className="min-w-0 flex-1">
        <small className={clsx('block text-xs font-bold tracking-[.06em] uppercase', hoje ? 'text-presente' : 'text-roxo')}>
          {hoje ? 'Hoje na agenda' : 'Próximo evento'}
        </small>
        <b className="mt-0.5 block text-lg leading-tight font-bold tracking-tight [overflow-wrap:break-word]">{ev.titulo}</b>
        <span className="mt-0.5 block text-sm text-apagado">{sub}</span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-apagado" />
    </button>
  );
}

/* No lugar do próximo evento, quando não há: o mês sem nada marcado (com
   o atalho para marcar), ou o mês que já acabou (quantos e o último). */
function ResumoMes({ validos, mes, r, onNovo }: { validos: Evento[]; mes: string; r: AgendaMes; onNovo: () => void }) {
  const nome = MESES[+mes.slice(5, 7) - 1];
  const ultimo = validos[validos.length - 1];
  const passado = mes < (r.hoje || hojeISO()).slice(0, 7);
  return (
    <div className="flex min-h-21 items-center gap-3 p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-roxo-fraco text-roxo">
        {validos.length ? <CalendarCheck size={24} /> : <Calendar size={24} />}
      </span>
      <span className="min-w-0 flex-1">
        <small className="block text-xs font-bold tracking-[.06em] text-roxo uppercase">
          {validos.length ? (passado ? 'Mês encerrado' : 'Nada mais neste mês') : 'Mês livre'}
        </small>
        <b className="mt-0.5 block text-lg leading-tight font-bold tracking-tight">
          {validos.length ? plural(validos.length, 'evento', 'eventos') + ' em ' + nome : 'Nada marcado em ' + nome}
        </b>
        <span className="mt-0.5 block text-sm text-apagado">
          {ultimo ? 'o último: ' + ultimo.titulo + ', ' + dataCurta(ultimo.data) : passado ? 'nenhum evento neste mês' : 'ensaio, apresentação, reunião…'}
        </span>
      </span>
      {!validos.length && !passado && (
        <button type="button" onClick={onNovo}
          className="shrink-0 rounded-full bg-roxo px-3.5 py-2 text-sm font-bold text-white active:bg-roxo-fundo">Marcar</button>
      )}
    </div>
  );
}

/* Passo de mês dentro do cartão elevado, com o nome dos vizinhos: "set"
   e "nov" dizem para onde o toque leva. */
function PassoMes({ mes, onAnterior, onProximo, comBorda }: {
  mes: string; onAnterior: () => void; onProximo: () => void; comBorda: boolean;
}) {
  const ant = somarMes(mes, -1), prox = somarMes(mes, 1);
  const bt = 'flex min-h-12 items-center gap-1 rounded-xl px-3 text-sm font-bold text-roxo transition-colors duration-150 active:bg-roxo-fraco';
  return (
    <div className={clsx('flex items-center justify-between gap-2 p-1.5', comBorda && 'border-t border-borda')}>
      <button type="button" className={bt} onClick={onAnterior} aria-label={'Mês anterior, ' + mesExtenso(ant)}>
        <ChevronLeft size={20} /> {MES_CURTO[+ant.slice(5, 7) - 1]}
      </button>
      <b className="text-[15px] font-bold tracking-tight" aria-live="polite">{mesExtenso(mes)}</b>
      <button type="button" className={bt} onClick={onProximo} aria-label={'Próximo mês, ' + mesExtenso(prox)}>
        {MES_CURTO[+prox.slice(5, 7) - 1]} <ChevronRight size={20} />
      </button>
    </div>
  );
}

/* Coluna fixa do dia, como a hora em "Hoje na grade". */
function DiaBloco({ iso, desde, forte, apagado }: { iso: string; desde?: boolean; forte?: boolean; apagado?: boolean }) {
  return (
    <span className={clsx('flex shrink-0 flex-col items-center justify-center rounded-2xl leading-none',
      forte ? 'size-12 bg-roxo text-white' : 'w-12 py-1', apagado ? 'text-apagado' : !forte && 'text-roxo')}>
      <b className={clsx('font-bold tracking-tighter tabular-nums', forte ? 'text-xl' : 'text-[22px]')}>{desde ? '…' : +iso.slice(8)}</b>
      <small className={clsx('mt-0.5 text-xs font-semibold lowercase', forte ? 'text-white/85' : '')}>
        {desde ? 'desde ' + dataCurta(iso) : diaSemanaIso(iso)}
      </small>
    </span>
  );
}

/* Linha de evento no padrão do Início: dia à esquerda, título e apoio no
   meio, selo escrito à direita (Hoje / Já passou / Cancelado). */
function LinhaEvento({ ev, mes, r, destaque }: { ev: Evento; mes: string; r: AgendaMes; destaque?: boolean }) {
  const navigate = useNavigate();
  const editar = () => navigate({ to: '/agenda/evento', search: { id: ev.id, mes: ev.data.slice(0, 7) } });
  const fim = ev.dataFim || ev.data;
  const passou = fim < r.hoje;
  const hoje = ev.data <= r.hoje && fim >= r.hoje;
  const cancelado = ev.status === 'Cancelado';
  const comecaAntes = ev.data.slice(0, 7) < mes;
  const linha: string[] = [];
  if (ev.dataFim) linha.push('até ' + dataCurta(ev.dataFim));
  linha.push(ev.local || textoTurmas(ev.turmas));
  /* O evento que está no cartão de cima aparece aqui marcado como
     "Próximo" — a lista não repete o cartão sem dizer que é o mesmo. */
  const selo = cancelado ? 'Cancelado' : hoje ? 'Hoje' : passou ? 'Já passou' : destaque ? 'Próximo'
    : ev.status === 'Confirmado' ? 'Confirmado' : '';

  return (
    <li className="relative not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-[76px] not-first:before:h-px not-first:before:bg-borda not-first:before:content-['']">
      <button type="button" onClick={() => verEvento(ev, r, editar)}
        aria-label={ev.titulo + (passou ? ', já passou' : '') + (cancelado ? ', cancelado' : '')}
        className={clsx('flex min-h-18 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 active:bg-roxo-fraco/60',
          passou && 'bg-fundo/50')}>
        <DiaBloco iso={ev.data} desde={comecaAntes} apagado={passou || cancelado} />
        <span className="min-w-0 flex-1">
          <b className={clsx('block text-base leading-snug font-bold [overflow-wrap:anywhere]',
            (cancelado || passou) && 'text-apagado', cancelado && 'line-through')}>{ev.titulo}</b>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Tag tipo={ev.tipo} cor={corTipo(r.cores, ev.tipo)} />
            <small className="min-w-0 text-[13px] leading-snug text-apagado">{linha.join(' · ')}</small>
          </span>
        </span>
        {selo && (
          <span className={clsx('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
            hoje && !cancelado ? 'bg-presente text-white'
              : cancelado ? 'bg-falta-fraco text-falta'
                : passou ? 'bg-fundo text-apagado' : 'bg-roxo-fraco text-roxo')}>
            {selo}
          </span>
        )}
      </button>
    </li>
  );
}

/* ─── ver um evento, na folha ─── */
function verEvento(ev: Evento, r: AgendaMes, editar: () => void) {
  const quando = ev.dataFim ? 'De ' + dataExtenso(ev.data) + ' a ' + dataExtenso(ev.dataFim) : dataExtenso(ev.data);
  folha.abrir(ev.titulo, (fechar) => (
    <>
      <div className="px-2 pb-2"><Tag tipo={ev.tipo} cor={corTipo(r.cores, ev.tipo)} /></div>
      <ul className="mx-2 mb-2">
        <Detalhe icone={Calendar}>{maiuscula(quando)}</Detalhe>
        <Detalhe icone={Users}>{textoTurmas(ev.turmas)}</Detalhe>
        {ev.local && <Detalhe icone={MapPin}>{ev.local}</Detalhe>}
        <Detalhe icone={Check}>{ev.status}</Detalhe>
        {ev.obs && <Detalhe icone={FileText}>{ev.obs}</Detalhe>}
      </ul>
      <ul>
        <OpcaoFolha icone={Pencil} onClick={() => { fechar(); folha.depois(editar); }}>Editar</OpcaoFolha>
        <OpcaoFolha icone={Check} sub="planejado, confirmado, realizado, cancelado"
          onClick={() => { fechar(); setTimeout(() => mudarStatus(ev, r.status), 60); }}>Mudar situação</OpcaoFolha>
        <OpcaoFolha icone={Trash2} sub="só para engano de digitação" perigo
          onClick={() => { fechar(); setTimeout(() => apagar(ev), 60); }}>Apagar</OpcaoFolha>
      </ul>
    </>
  ));
}

function mudarStatus(ev: Evento, lista: string[]) {
  folha.opcoes('Situação de ' + ev.titulo, lista.map((st) => ({
    txt: st, marcado: st === ev.status,
    fn: () => {
      if (st === ev.status) return;
      escrever('editarEvento', [ev.id, { status: st }])
        .then(() => { vibrar(); toast(ev.titulo + ': ' + st.toLowerCase()); })
        .catch((e) => toast(textoErro(e), 'erro'));
    },
  })));
}

function apagar(ev: Evento) {
  folha.confirmar('Apagar evento',
    ev.titulo + ' some da agenda. Se ele só não vai mais acontecer, prefira "Cancelado": fica registrado no ano.',
    'Apagar', () => {
      escrever('excluirEvento', [ev.id])
        .then(() => { vibrar(); toast('Evento apagado'); })
        .catch((e) => toast(textoErro(e), 'erro'));
    });
}

function Detalhe({ icone: Ic, children }: { icone: typeof Calendar; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-2 text-[15px] leading-normal">
      <Ic size={18} className="mt-0.5 shrink-0 text-apagado" /><span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </li>
  );
}

function OpcaoFolha({ icone: Ic, children, sub, perigo, onClick }: {
  icone: typeof Calendar; children: string; sub?: string; perigo?: boolean; onClick: () => void;
}) {
  return (
    <li>
      <button type="button" onClick={onClick}
        className={clsx('flex min-h-14 w-full items-center gap-3 rounded-p p-3 text-left text-base font-semibold transition-colors duration-150 active:bg-fundo',
          perigo && 'text-falta')}>
        <Ic size={20} className="shrink-0" />
        <span className="min-w-0">{children}{sub && <small className="block text-[13px] font-normal text-apagado">{sub}</small>}</span>
      </button>
    </li>
  );
}
