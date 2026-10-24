/* Escolher a turma. Sem internet, vale a lista guardada no celular. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { CalendarClock, CloudOff, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../api/cliente';
import { FaixaSemInternet, useOnline, usandoCopia } from '../../../offline/rede';
import { Tela } from '../../../ui/Tela';
import { CARTAO, Esqueleto, Estado, GrupoNav } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { DIAS, Hora, Selo, detalheHorario, leituraGrade, minutos, primeiraDepois, situacaoHoje, type Grade } from '../grade/-comum';

export const Route = createFileRoute('/_app/chamada/')({ component: Turmas });

function Turmas() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useOnline();
  const q = useQuery(leitura<string[]>('listarTurmas'));
  const turmas = q.data;
  /* A grade vem junto (e fica guardada no celular): com ela, as aulas de
     hoje aparecem primeiro, na ordem do dia. */
  const grade = useQuery(leituraGrade()).data;
  const deHoje = grade ? grade.horarios.filter((h) => h.dia === grade.dia).sort((a, b) => minutos(a.inicio) - minutos(b.inicio)) : [];

  /* Quem abriu a lista vai tocar numa turma. Vão todas por trás: a
     chamada abre sem espera, e cada turma fica guardada no celular para
     a chamada funcionar sem internet. */
  useEffect(() => {
    if (!turmas || !online) return;
    turmas.slice(0, 16).forEach((t) => qc.prefetchQuery({ ...leitura('carregarTurma', t), staleTime: 300_000 }));
  }, [turmas, online, qc]);

  const abrir = (t: string) => navigate({ to: '/chamada/$turma', params: { turma: t } });

  return (
    <Tela titulo="Chamada" sub="Qual turma está entrando agora?">
      {usandoCopia(q, online) && <FaixaSemInternet desde={q.dataUpdatedAt} />}
      {grade && deHoje.length > 0 && <AulasDeHoje g={grade} />}
      {turmas ? (
        turmas.length ? (
          <>
            <GrupoNav titulo={deHoje.length ? 'Todas as turmas' : undefined}
              itens={turmas.map((t) => ({ icone: Users, titulo: t, onClick: () => abrir(t) }))} />
            {!deHoje.length && (
              <GrupoNav itens={[{
                icone: CalendarClock, titulo: 'Grade de aulas',
                sub: grade && grade.horarios.length ? 'nenhuma aula na grade hoje · ver a semana' : 'cadastre o dia e a hora de cada turma',
                onClick: () => navigate({ to: '/grade' }),
              }]} />
            )}
          </>
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
    </Tela>
  );
}

/* Aulas de hoje, na ordem do dia: um toque e está na lista de chamada.
   Selo com texto (Agora, Próxima, Já passou, Chamada feita). */
function AulasDeHoje({ g }: { g: Grade }) {
  const navigate = useNavigate();
  const hs = g.horarios.filter((h) => h.dia === g.dia).sort((a, b) => minutos(a.inicio) - minutos(b.inicio));
  const proxima = primeiraDepois(hs, g.feitasHoje);
  return (
    <section className="mb-5" aria-label="Aulas de hoje">
      <div className="mx-1 mb-1.5 flex items-end justify-between gap-3">
        <h2 className="text-[13px] font-semibold tracking-wide text-apagado uppercase">Aulas de hoje · {DIAS[g.dia].toLowerCase()}</h2>
        <button type="button" onClick={() => navigate({ to: '/grade' })}
          className="-my-3 -mr-2 min-h-11 rounded-p px-2 text-sm font-semibold text-roxo active:bg-roxo-fraco">
          Ver a semana
        </button>
      </div>
      <ul className={clsx(CARTAO, 'overflow-hidden')}>
        {hs.map((h) => {
          const s = situacaoHoje(h, g.feitasHoje, undefined, proxima);
          return (
            <li key={h.id} className={clsx('relative',
              'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-[86px]',
              'not-first:before:h-px not-first:before:bg-borda not-first:before:content-[""]')}>
              <button type="button" onClick={() => navigate({ to: '/chamada/$turma', params: { turma: h.turma } })}
                className={clsx('flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 active:bg-roxo-fraco/60',
                  s === 'agora' && 'bg-roxo-fraco/50', s === 'passou' && 'opacity-75')}>
                <Hora h={h} forte={s === 'agora'} />
                <span className="min-w-0 flex-1">
                  <b className="block text-base leading-tight font-semibold [overflow-wrap:anywhere]">{h.turma}</b>
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
