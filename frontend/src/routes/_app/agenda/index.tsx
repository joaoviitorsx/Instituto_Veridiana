/* Agenda anual, vista mês a mês. Não substitui o calendário de papel da
   coordenação: alimenta ele. O fim da linha é o PDF para imprimir. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Calendar, CalendarClock, Check, FileText, MapPin, Pencil, Plus, Printer, Table, Trash2, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { escrever, leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { CARTAO, Esqueleto, Estado } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { dataCurta, dataExtenso, hojeISO, maiuscula, MESES, mesExtenso, textoErro, vibrar } from '../../../util';
import {
  corTipo, diaSemanaIso, mesDeHoje, mesValido, Passo, somarMes, Tag, textoTurmas,
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

  return (
    <Tela titulo="Agenda"
      fab={{ icone: Plus, texto: 'Novo evento', onClick: novo }}>
      <Passo rotulo={mesExtenso(mes)} onAnterior={() => irMes(-1)} onProximo={() => irMes(1)}
        nomeAnterior="Mês anterior" nomeProximo="Próximo mês" />
      <div className="mb-4 flex gap-2">
        <Atalho icone={Table} onClick={() => navigate({ to: '/agenda/ano', search: { ano: +mes.slice(0, 4) } })}>Ver o ano</Atalho>
        <Atalho icone={Printer} onClick={() => navigate({ to: '/agenda/imprimir', search: { ano: +mes.slice(0, 4) } })}>Imprimir</Atalho>
        <Atalho icone={CalendarClock} onClick={() => navigate({ to: '/grade' })}>Aulas</Atalho>
      </div>

      {r ? (
        r.eventos.length ? (
          <ul>
            {r.eventos.map((ev) => <CartaoEvento key={ev.id || ev.titulo + ev.data} ev={ev} mes={mes} r={r} />)}
          </ul>
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
    </Tela>
  );
}

function Atalho({ icone: Ic, children, onClick }: { icone: typeof Table; children: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-m border border-borda bg-papel text-[15px] font-bold text-roxo transition-colors duration-150 active:bg-fundo">
      <Ic size={18} /> {children}
    </button>
  );
}

function CartaoEvento({ ev, mes, r }: { ev: Evento; mes: string; r: AgendaMes }) {
  const navigate = useNavigate();
  const editar = () => navigate({ to: '/agenda/evento', search: { id: ev.id, mes: ev.data.slice(0, 7) } });
  const passou = ev.dataFim ? ev.dataFim < r.hoje : ev.data < r.hoje;
  const cancelado = ev.status === 'Cancelado';
  const comecaAntes = ev.data.slice(0, 7) < mes;
  const linha: string[] = [];
  if (ev.dataFim) linha.push('de ' + dataCurta(ev.data) + ' a ' + dataCurta(ev.dataFim));
  linha.push(textoTurmas(ev.turmas));
  if (ev.local) linha.push(ev.local);
  if (ev.status !== 'Planejado') linha.push(ev.status);

  return (
    <li className="mb-3">
      <button type="button" onClick={() => verEvento(ev, r, editar)}
        aria-label={ev.titulo + (passou ? ', já passou' : '') + (cancelado ? ', cancelado' : '')}
        className={clsx(CARTAO, 'flex w-full items-stretch overflow-hidden text-left transition-colors duration-150 active:bg-fundo',
          passou && 'bg-fundo/60 shadow-none')}>
        <span className={clsx('flex w-16 shrink-0 flex-col items-center justify-center px-1 py-3',
          passou ? 'bg-fundo text-apagado' : 'bg-roxo-fraco text-roxo')}>
          <b className="text-[26px] leading-none font-bold tracking-tighter tabular-nums">{comecaAntes ? '…' : +ev.data.slice(8)}</b>
          <small className="mt-1 text-center text-xs font-semibold lowercase">{comecaAntes ? 'desde ' + dataCurta(ev.data) : diaSemanaIso(ev.data)}</small>
        </span>
        <span className="min-w-0 flex-1 px-4 py-3">
          <Tag tipo={ev.tipo} cor={corTipo(r.cores, ev.tipo)} />
          <b className={clsx('mt-1.5 block text-base leading-snug font-bold [overflow-wrap:anywhere]',
            (cancelado || passou) && 'text-apagado', cancelado && 'line-through')}>{ev.titulo}</b>
          <small className="mt-0.5 block text-[13px] leading-snug text-apagado">{linha.join(' · ')}</small>
        </span>
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
        <OpcaoFolha icone={Pencil} onClick={() => { fechar(); setTimeout(editar, 60); }}>Editar</OpcaoFolha>
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
