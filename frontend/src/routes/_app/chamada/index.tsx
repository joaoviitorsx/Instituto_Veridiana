/* Escolher a turma. Sem internet, vale a lista guardada no celular.

   Tela raiz: segue o DNA do Início (DESIGN.md §16). Topo roxo com o
   resumo do dia, o cartão da aula de agora por cima da borda, as aulas de
   hoje pela grade e, embaixo, todas as turmas. Só o que a professora usa
   para abrir a chamada: cadastro de horário e histórico ficam na Grade e
   na Gestão. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { CalendarClock, CalendarDays, CalendarPlus, CircleCheck, ClipboardCheck, CloudOff, CloudUpload, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../api/cliente';
import { FaixaSemInternet, useOnline, usandoCopia } from '../../../offline/rede';
import { useFila } from '../../../offline/envio';
import { Tela } from '../../../ui/Tela';
import { Banner, CARTAO, Esqueleto, Estado, GrupoNav, Osso } from '../../../ui/kit';
import { BotaoHeroi, CabecalhoSecao, Corpo, Heroi, Sobreposto } from '../../../ui/Heroi';
import { CartaoAulaAgora, CartaoDestaque, textoDaAula } from '../../../ui/CartaoAula';
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
        {/* Só aparece quando há o que enviar: "tudo enviado" não precisa de botão. */}
        {fila.length > 0 && (
          <Banner tom="atencao" icone={CloudUpload} titulo={plural(fila.length, 'chamada esperando internet', 'chamadas esperando internet')}
            acao={{ txt: 'Ver o que está guardado', fn: () => navigate({ to: '/pendentes' }) }}>
            Está guardada neste celular e vai ser enviada sozinha.
          </Banner>
        )}

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
    return <CartaoAulaAgora turma={alvo.turma} agora={ehAgora}
      sub={textoDaAula({ agora: ehAgora, inicio: horaCurta(alvo.inicio), fim: horaCurta(alvo.fim), sala: alvo.sala })}
      onClick={() => onAbrir(alvo.turma)} />;
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
    <CartaoDestaque icone={Ic} tom={tudoFeito ? 'ok' : 'suave'} rotulo={rotulo} titulo={titulo} sub={sub}
      onClick={() => navigate({ to: temGrade ? '/grade' : '/grade/horario' })} />
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
