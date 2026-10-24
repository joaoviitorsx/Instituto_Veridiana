/* Escolher a turma. Sem internet, vale a lista guardada no celular.

   Tela raiz: segue o DNA do Início (DESIGN.md §16). Topo roxo com o
   resumo do dia, o cartão da aula de agora por cima da borda, atalhos,
   as aulas de hoje pela grade e, embaixo, todas as turmas. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  CalendarClock, CalendarDays, CalendarPlus, ChevronRight, CircleCheck, ClipboardCheck, CloudOff, CloudUpload,
  History, Users,
} from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../api/cliente';
import { FaixaSemInternet, useOnline, usandoCopia } from '../../../offline/rede';
import { useFila } from '../../../offline/envio';
import { Tela } from '../../../ui/Tela';
import { CARTAO, Esqueleto, Estado, GrupoNav, Osso } from '../../../ui/kit';
import { Atalhos, BotaoHeroi, CabecalhoSecao, CARTAO_ELEVADO, Corpo, Heroi, Sobreposto, type Atalho } from '../../../ui/Heroi';
import { ErroTela } from '../../../ui/ErroTela';
import { dataExtenso, hojeISO, maiuscula, plural } from '../../../util';
import {
  DIAS, Hora, Selo, detalheHorario, horaCurta, leituraGrade, minutos, primeiraDepois, situacaoHoje,
  type Grade, type Horario,
} from '../grade/-comum';

export const Route = createFileRoute('/_app/chamada/')({ component: Turmas });

function Turmas() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useOnline();
  const fila = useFila();
  const q = useQuery(leitura<string[]>('listarTurmas'));
  const turmas = q.data;
  /* A grade vem junto (e fica guardada no celular): com ela, as aulas de
     hoje aparecem primeiro, na ordem do dia. */
  const gq = useQuery(leituraGrade());
  const grade = gq.data;
  const deHoje = grade ? grade.horarios.filter((h) => h.dia === grade.dia).sort((a, b) => minutos(a.inicio) - minutos(b.inicio)) : [];
  const feitas = grade ? deHoje.filter((h) => grade.feitasHoje.includes(h.turma)).length : 0;

  /* Quem abriu a lista vai tocar numa turma. Vão todas por trás: a
     chamada abre sem espera, e cada turma fica guardada no celular para
     a chamada funcionar sem internet. */
  useEffect(() => {
    if (!turmas || !online) return;
    turmas.slice(0, 16).forEach((t) => qc.prefetchQuery({ ...leitura('carregarTurma', t), staleTime: 300_000 }));
  }, [turmas, online, qc]);

  const abrir = (t: string) => navigate({ to: '/chamada/$turma', params: { turma: t } });

  const atalhos: Atalho[] = [
    { icone: CalendarDays, texto: 'Grade de aulas', to: '/grade' },
    { icone: CalendarPlus, texto: 'Novo horário', to: '/grade/horario' },
    fila.length
      ? { icone: CloudUpload, texto: plural(fila.length, 'pendente', 'pendentes'), to: '/pendentes' }
      : { icone: CircleCheck, texto: 'Tudo enviado', to: '/pendentes' },
    { icone: History, texto: 'Histórico', to: '/gestao/historico' },
  ];

  return (
    <Tela titulo="Chamada" voltar={false} roxo solto
      capa={
        <Heroi sobre={maiuscula(dataExtenso(hojeISO()))} titulo="Chamada"
          direita={<BotaoHeroi rotulo="Grade de aulas da semana" onClick={() => navigate({ to: '/grade' })}><CalendarDays size={22} /></BotaoHeroi>}
          pilulas={[
            !!turmas && { icone: Users, texto: plural(turmas.length, 'turma', 'turmas') },
            deHoje.length > 0 && { icone: ClipboardCheck, texto: feitas + ' de ' + plural(deHoje.length, 'aula', 'aulas') + ' com chamada' },
          ]} />
      }>
      <Sobreposto>
        <CartaoPrincipal g={grade} carregando={gq.isPending && !grade} onAbrir={abrir} />
      </Sobreposto>

      <Corpo>
        {usandoCopia(q, online) && <FaixaSemInternet desde={q.dataUpdatedAt} />}
        <Atalhos itens={atalhos} />

        {grade && deHoje.length > 0 && <AulasDeHoje g={grade} hs={deHoje} />}

        {turmas ? (
          turmas.length ? (
            <section aria-label="Todas as turmas">
              <CabecalhoSecao titulo={deHoje.length ? 'Todas as turmas' : 'Qual turma está entrando?'} />
              <GrupoNav itens={turmas.map((t) => ({
                icone: Users, titulo: t, onClick: () => abrir(t),
                sub: grade?.feitasHoje.includes(t) ? 'chamada feita hoje' : undefined,
              }))} />
            </section>
          ) : (
            <Estado icone={Users} titulo="Nenhuma turma ainda"
              texto="Quando a gestão criar as turmas e cadastrar os alunos, elas aparecem aqui."
              botao={{ txt: 'Ir para Gestão → Turmas', fn: () => navigate({ to: '/gestao/turmas' }) }} />
          )
        ) : q.fetchStatus === 'paused' || (!online && !q.isFetching) ? (
          <Estado icone={CloudOff} titulo="Sem internet agora"
            texto="Na primeira vez, a lista de turmas precisa de internet. Depois ela fica guardada no celular e abre até sem sinal."
            botao={{ txt: 'Tentar de novo', fn: () => q.refetch() }} />
        ) : q.isError ? (
          <ErroTela erro={q.error} tentar={() => q.refetch()} />
        ) : (
          <Esqueleto n={4} />
        )}
      </Corpo>
    </Tela>
  );
}

/* O cartão por cima do roxo: a aula que está acontecendo (ou a próxima de
   hoje) pela grade, um toque e está na chamada — o mesmo do Início.
   Sem aula pela frente, diz como está o dia; sem grade, convida a
   cadastrar (é ela que faz o cartão acertar a aula). */
function CartaoPrincipal({ g, carregando, onAbrir }: { g?: Grade; carregando: boolean; onAbrir: (t: string) => void }) {
  const navigate = useNavigate();
  if (carregando) return <Osso className="h-21 rounded-2xl shadow-cartao" />;

  const hs = g ? g.horarios.filter((h) => h.dia === g.dia).sort((a, b) => minutos(a.inicio) - minutos(b.inicio)) : [];
  const proxima = g ? primeiraDepois(hs, g.feitasHoje) : undefined;
  const agora = g ? hs.find((h) => situacaoHoje(h, g.feitasHoje, undefined, proxima) === 'agora') : undefined;
  const alvo: Horario | undefined = agora || hs.find((h) => h.id === proxima);

  if (g && alvo) {
    const ehAgora = alvo === agora;
    return (
      <button type="button" onClick={() => onAbrir(alvo.turma)}
        className={clsx(CARTAO_ELEVADO, 'flex min-h-21 w-full items-center gap-3 p-4 text-left transition-colors duration-150 ease-curva active:bg-fundo')}>
        <span className={clsx('relative grid size-12 shrink-0 place-items-center rounded-2xl text-white', ehAgora ? 'bg-presente' : 'bg-roxo')}>
          <CalendarClock size={24} />
          {ehAgora && <span className="absolute -top-1 -right-1 size-3.5 rounded-full border-2 border-papel bg-presente motion-safe:animate-pulse" />}
        </span>
        <span className="min-w-0 flex-1">
          <small className={clsx('block text-xs font-bold tracking-[.06em] uppercase', ehAgora ? 'text-presente' : 'text-roxo')}>
            {ehAgora ? 'Aula agora' : 'Próxima aula'}
          </small>
          <b className="mt-0.5 block text-lg leading-tight font-bold tracking-tight hyphens-auto [overflow-wrap:anywhere]">{alvo.turma}</b>
          <span className="mt-0.5 block text-sm text-apagado">
            {(ehAgora ? 'agora · até ' + horaCurta(alvo.fim) : 'começa às ' + horaCurta(alvo.inicio)) + (alvo.sala ? ' · ' + alvo.sala : '')}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-roxo px-3.5 py-2 text-sm font-bold text-white">Chamada</span>
      </button>
    );
  }

  /* Sem aula pela frente hoje: o cartão conta como foi o dia, ou leva à grade. */
  const tudoFeito = !!g && hs.length > 0 && hs.every((h) => g.feitasHoje.includes(h.turma));
  const temGrade = !!g && g.horarios.length > 0;
  const [Ic, rotulo, titulo, sub] = tudoFeito
    ? [CircleCheck, 'Hoje', 'Todas as aulas de hoje têm chamada', 'Ver a grade da semana']
    : hs.length
      ? [CalendarClock, 'Hoje', 'As aulas de hoje já passaram', 'Escolha a turma abaixo ou veja a semana']
      : temGrade
        ? [CalendarDays, DIAS[g!.dia], 'Sem aula na grade hoje', 'Escolha a turma abaixo ou veja a semana']
        : [CalendarPlus, 'Grade de aulas', 'Cadastre o horário das turmas', 'Assim a aula que está começando aparece aqui'];
  return (
    <button type="button" onClick={() => navigate({ to: temGrade ? '/grade' : '/grade/horario' })}
      className={clsx(CARTAO_ELEVADO, 'flex min-h-21 w-full items-center gap-3 p-4 text-left transition-colors duration-150 ease-curva active:bg-fundo')}>
      <span className={clsx('grid size-12 shrink-0 place-items-center rounded-2xl', tudoFeito ? 'bg-presente text-white' : 'bg-roxo-fraco text-roxo')}>
        <Ic size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <small className={clsx('block text-xs font-bold tracking-[.06em] uppercase', tudoFeito ? 'text-presente' : 'text-roxo')}>{rotulo}</small>
        <b className="mt-0.5 block text-lg leading-tight font-bold tracking-tight">{titulo}</b>
        <span className="mt-0.5 block text-sm text-apagado">{sub}</span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-apagado" />
    </button>
  );
}

/* Aulas de hoje, na ordem do dia: um toque e está na lista de chamada.
   Coluna de hora à esquerda, selo escrito à direita (Agora, Próxima, Já
   passou, Chamada feita) — o mesmo desenho do "Hoje na grade" do Início. */
function AulasDeHoje({ g, hs }: { g: Grade; hs: Horario[] }) {
  const navigate = useNavigate();
  const proxima = primeiraDepois(hs, g.feitasHoje);
  return (
    <section className="mb-6" aria-label="Aulas de hoje">
      <CabecalhoSecao titulo={'Aulas de hoje · ' + DIAS[g.dia].toLowerCase()}
        acao={{ txt: 'Ver semana', onClick: () => navigate({ to: '/grade' }) }} />
      <ul className={clsx(CARTAO, 'overflow-hidden')}>
        {hs.map((h) => {
          const s = situacaoHoje(h, g.feitasHoje, undefined, proxima);
          return (
            <li key={h.id} className={clsx('relative',
              'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-[86px]',
              'not-first:before:h-px not-first:before:bg-borda not-first:before:content-[""]')}>
              <button type="button" onClick={() => navigate({ to: '/chamada/$turma', params: { turma: h.turma } })}
                className={clsx('flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 active:bg-roxo-fraco/60',
                  s === 'agora' && 'bg-roxo-fraco/50')}>
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
    </section>
  );
}
