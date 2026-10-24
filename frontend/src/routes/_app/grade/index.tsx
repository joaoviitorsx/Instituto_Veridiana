/* Grade de aulas: o dia (com hoje já marcado) ou a semana inteira.
   Quem tem aula, de que hora a que hora, em que sala e com quem. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { escrever, ErroRede } from '../../../api/cliente';
import { FaixaSemInternet, useOnline, usandoCopia } from '../../../offline/rede';
import { Tela } from '../../../ui/Tela';
import { BotaoCheio, CARTAO, Esqueleto, Estado, Filtro } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { CabecalhoSecao } from '../../../ui/Heroi';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { plural, textoErro, vibrar } from '../../../util';
import {
  DIAS, DIAS_CURTOS, ORDEM_SEMANA, Hora, Selo, detalheHorario, horaCurta, leituraGrade, minutos,
  primeiraDepois, situacaoHoje, type Grade, type Horario,
} from './-comum';

type Busca = { dia?: number; ver?: 'semana' };

export const Route = createFileRoute('/_app/grade/')({
  validateSearch: (s: Record<string, unknown>): Busca => {
    const b: Busca = {};
    const d = Number(s.dia);
    if (s.dia !== undefined && s.dia !== '' && Number.isInteger(d) && d >= 0 && d <= 6) b.dia = d;
    if (s.ver === 'semana') b.ver = 'semana';
    return b;
  },
  component: TelaGrade,
});

function TelaGrade() {
  const busca = Route.useSearch();
  const navigate = useNavigate();
  const online = useOnline();
  const q = useQuery(leituraGrade());
  const g = q.data;
  const ver = busca.ver === 'semana' ? 'semana' : 'dia';
  const dia = busca.dia ?? g?.dia ?? new Date().getDay();

  /* Trocar de dia ou de visão não empilha tela: voltar sai da grade. */
  const mudar = (b: Busca) => { vibrar(); navigate({ to: '/grade', search: { ...busca, ...b }, replace: true }); };
  const novo = () => navigate({ to: '/grade/horario', search: { dia } });

  return (
    <Tela titulo="Grade de aulas" voltar="/chamada"
      barra={g && <BotaoCheio icone={Plus} onClick={novo} className="text-[17px]">Novo horário</BotaoCheio>}>
      {g && usandoCopia(q, online) && <FaixaSemInternet desde={q.dataUpdatedAt} oQue="grade" />}
      <Filtro valor={ver} onChange={(v) => mudar({ ver: v === 'semana' ? 'semana' : undefined })}
        opcoes={[{ v: 'dia', txt: 'Por dia' }, { v: 'semana', txt: 'Semana toda' }]} />

      {g ? (
        !g.horarios.length ? (
          <Estado icone={CalendarClock} titulo="A grade ainda está vazia"
            texto="Cadastre o dia e a hora de cada turma. A chamada mostra as aulas de hoje e a tela inicial avisa a aula que está começando."
            botao={{ txt: 'Cadastrar o primeiro horário', fn: novo }} />
        ) : ver === 'dia' ? (
          <VisaoDia g={g} dia={dia} onDia={(d) => mudar({ dia: d })} />
        ) : (
          <VisaoSemana g={g} />
        )
      ) : q.isError ? (
        <ErroTela erro={q.error} tentar={() => q.refetch()} />
      ) : (
        <Esqueleto n={4} />
      )}
    </Tela>
  );
}

/* ─── um dia ─── */
function VisaoDia({ g, dia, onDia }: { g: Grade; dia: number; onDia: (d: number) => void }) {
  const navigate = useNavigate();
  const doDia = g.horarios.filter((h) => h.dia === dia).sort((a, b) => minutos(a.inicio) - minutos(b.inicio));
  const ehHoje = dia === g.dia;
  const proxima = ehHoje ? primeiraDepois(doDia, g.feitasHoje) : undefined;
  /* Domingo só aparece se alguém tem aula nele (ou se é hoje). */
  const dias = ORDEM_SEMANA.filter((d) => d !== 0 || g.horarios.some((h) => h.dia === 0) || g.dia === 0);

  return (
    <>
      <div role="tablist" aria-label="Dia da semana"
        className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {dias.map((d) => {
          const n = g.horarios.filter((h) => h.dia === d).length;
          const ligado = d === dia;
          return (
            <button key={d} type="button" role="tab" aria-selected={ligado}
              aria-label={DIAS[d] + (d === g.dia ? ', hoje' : '') + ', ' + plural(n, 'aula', 'aulas')}
              onClick={() => onDia(d)}
              className={clsx('flex min-h-14 min-w-12 flex-1 shrink-0 flex-col items-center justify-center rounded-2xl border px-1 py-1.5',
                'transition-colors duration-150',
                ligado ? 'border-roxo bg-roxo text-white shadow-[0_6px_16px_rgba(74,29,110,.25)]' : d === g.dia ? 'border-roxo bg-papel text-roxo' : 'border-borda bg-papel text-tinta')}>
              <b className="text-[15px] leading-tight font-bold">{DIAS_CURTOS[d]}</b>
              <span className={clsx('text-xs leading-tight', ligado ? 'text-roxo-claro' : 'text-apagado')}>
                {d === g.dia ? 'hoje' : n ? n + (n === 1 ? ' aula' : ' aulas') : 'livre'}
              </span>
            </button>
          );
        })}
      </div>

      <CabecalhoSecao titulo={DIAS[dia] + (ehHoje ? ' · hoje' : '') + ' · ' + plural(doDia.length, 'aula', 'aulas')} />
      {doDia.length ? (
        <ListaHorarios hs={doDia} g={g} hoje={ehHoje} proxima={proxima} />
      ) : (
        <Estado icone={CalendarClock} titulo={'Sem aula na ' + DIAS[dia].toLowerCase()}
          texto="Nenhuma turma tem aula neste dia."
          botao={{ txt: 'Cadastrar aula na ' + DIAS[dia].toLowerCase(), fn: () => navigate({ to: '/grade/horario', search: { dia } }) }} />
      )}
    </>
  );
}

/* ─── a semana inteira, compacta ─── */
function VisaoSemana({ g }: { g: Grade }) {
  const dias = ORDEM_SEMANA.filter((d) => d !== 0 || g.horarios.some((h) => h.dia === 0));
  return (
    <>
      {dias.map((d) => {
        const hs = g.horarios.filter((h) => h.dia === d).sort((a, b) => minutos(a.inicio) - minutos(b.inicio));
        const ehHoje = d === g.dia;
        return (
          <section key={d} className="mb-5" aria-label={DIAS[d]}>
            <CabecalhoSecao titulo={<span className="flex items-center gap-2">{DIAS[d]}
              {ehHoje && <span className="rounded-full bg-roxo px-2 py-0.5 text-xs font-bold tracking-normal text-white normal-case">hoje</span>}
            </span>} />
            {hs.length ? (
              <ListaHorarios hs={hs} g={g} hoje={ehHoje} proxima={ehHoje ? primeiraDepois(hs, g.feitasHoje) : undefined} compacta />
            ) : (
              <p className={clsx(CARTAO, 'rounded-2xl px-4 py-3 text-sm text-apagado')}>Sem aula</p>
            )}
          </section>
        );
      })}
    </>
  );
}

/* ─── a lista de horários, usada nas duas visões ─── */
function ListaHorarios({ hs, g, hoje, proxima, compacta }: {
  hs: Horario[]; g: Grade; hoje: boolean; proxima?: string; compacta?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <ul className={clsx(CARTAO, 'mb-4 overflow-hidden rounded-2xl')}>
      {hs.map((h) => {
        const s = hoje ? situacaoHoje(h, g.feitasHoje, undefined, proxima) : 'depois';
        return (
          <li key={h.id} className={clsx('relative',
            'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-[86px]',
            'not-first:before:h-px not-first:before:bg-borda not-first:before:content-[""]')}>
            <button type="button" onClick={() => abrirHorario(h, g, navigate)}
              className={clsx('flex w-full items-center gap-3 px-4 text-left transition-colors duration-150 active:bg-roxo-fraco/60',
                compacta ? 'min-h-14 py-2' : 'min-h-[68px] py-3',
                s === 'agora' && 'bg-roxo-fraco/50')}>
              {/* Aula que passou: dita pelo selo "Já passou" e pelo nome em
                  cinza, sem transparência (que baixava o contraste para 3:1). */}
              <Hora h={h} forte={s === 'agora'} />
              <span className="min-w-0 flex-1">
                <b className={clsx('block text-base leading-tight font-semibold [overflow-wrap:anywhere]', s === 'passou' && 'text-apagado')}>{h.turma}</b>
                <small className="mt-0.5 block truncate text-[13px] text-apagado">{detalheHorario(h)}</small>
              </span>
              <Selo s={s} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* Tocar num horário: o que dá para fazer com ele. */
function abrirHorario(h: Horario, g: Grade, navigate: ReturnType<typeof useNavigate>) {
  folha.opcoes(h.turma + ' · ' + DIAS[h.dia].toLowerCase() + ', ' + horaCurta(h.inicio) + ' às ' + horaCurta(h.fim), [
    ...(h.dia === g.dia ? [{ txt: 'Fazer a chamada', sub: g.feitasHoje.includes(h.turma) ? 'já tem chamada hoje' : undefined, icone: ClipboardList, fn: () => navigate({ to: '/chamada/$turma', params: { turma: h.turma } }) }] : []),
    { txt: 'Editar horário', icone: Pencil, fn: () => navigate({ to: '/grade/horario', search: { id: h.id } }) },
    {
      txt: 'Tirar da grade', icone: Trash2, perigo: true,
      fn: () => folha.confirmar('Tirar da grade?',
        h.turma + ' deixa de aparecer na ' + DIAS[h.dia].toLowerCase() + ', ' + horaCurta(h.inicio) + '. As chamadas que já foram feitas continuam guardadas.',
        'Tirar da grade', async () => {
          try {
            await escrever('excluirHorario', [h.id]);
            vibrar(); toast('Horário tirado da grade');
          } catch (e) {
            toast(e instanceof ErroRede ? 'Sem internet agora. Tente de novo quando a conexão voltar.' : textoErro(e), 'erro');
          }
        }),
    },
  ]);
}
