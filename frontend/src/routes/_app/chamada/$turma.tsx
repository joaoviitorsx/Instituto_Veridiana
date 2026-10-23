/* A lista de chamada.

   Fluxo igual ao app HTML: abre com todo mundo em falta, um toque dá
   presença, o segundo falta justificada, o terceiro volta para falta.
   Professora já vem escolhida pelo login.

   Diferença do PWA: funciona sem internet. A lista vem da cópia guardada
   no celular (com a data na faixa do topo) e salvar sem conexão guarda
   a chamada na fila, que envia sozinha depois. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Cake, Check, ChevronRight, CircleAlert, CloudOff, User, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { api, ehErroRede, ehErroSessao, invalidarDepoisDe, leitura, ErroConfig } from '../../../api/cliente';
import { guardarNaFila, tirarDaFila, dadosDoItem, type Presenca, type Resposta } from '../../../offline/fila';
import { emMaos, pedirSincronizacao, useFila } from '../../../offline/envio';
import { FaixaSemInternet, useOnline, usandoCopia } from '../../../offline/rede';
import { useSessao } from '../../../sessao';
import { Tela, Capa } from '../../../ui/Tela';
import { Avatar, Aviso, CARTAO, Esqueleto, Estado, Lista } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { dataExtenso, hojeISO, maiuscula, plural, semAcento, sorteioToken, textoErro, vibrar } from '../../../util';

export type Turma = {
  turma: string; alunos: string[]; professores: string[]; professorSugerido: string;
  data: string; jaRegistrada: boolean; aniversarios: { aluno: string; faz: number }[];
};
type Status = Presenca['status'];
const CICLO: Record<Status, Status> = { Falta: 'Presente', Presente: 'Justificada', Justificada: 'Falta' };
/* Elenco que chegou há menos disso serve sem perguntar de novo ao servidor. */
const FRESCO = 300_000;

export const Route = createFileRoute('/_app/chamada/$turma')({
  validateSearch: (s: Record<string, unknown>): { qr?: 1 } => (s.qr ? { qr: 1 } : {}),
  component: Chamada,
});

function Chamada() {
  const { turma } = Route.useParams();
  const { qr } = Route.useSearch();
  const online = useOnline();
  const q = useQuery({ ...leitura<Turma>('carregarTurma', turma), staleTime: FRESCO });

  /* Uma resposta só, nunca repintada: repintar a lista apagaria as
     presenças já marcadas. Usa o guardado se for recente; senão espera o
     servidor, e só cai no guardado se o servidor não responder. */
  const recente = !!q.data && Date.now() - q.dataUpdatedAt < FRESCO;
  const copia = usandoCopia(q, online);
  const pronto = !!q.data && (recente || q.isFetchedAfterMount || copia);
  const [guardada, setBase] = useState<{ d: Turma; em: number; copia: boolean } | null>(null);
  /* Trocou de turma sem desmontar a tela (QR de outra sala): a base velha não vale. */
  const base = guardada && guardada.d.turma === turma ? guardada : null;
  useEffect(() => {
    if (!base && pronto && q.data) setBase({ d: q.data, em: q.dataUpdatedAt, copia });
  }, [base, pronto, q.data, q.dataUpdatedAt, copia]);

  const capa = (n?: string, r?: string, sub?: string) => (
    <Capa titulo={turma} sub={sub ?? 'carregando…'}
      direita={<>
        <b className="text-[32px] font-bold tracking-tighter tabular-nums">{n ?? '—'}</b>
        <span className="mt-1 block text-[13px] font-medium text-roxo-claro">{r ?? ' '}</span>
      </>} />
  );

  if (!base) {
    const semCopia = !q.data && (q.fetchStatus === 'paused' || !online || (q.isError && ehErroRede(q.error)));
    return (
      <Tela titulo={turma} capa={capa()} voltar={qr ? false : '/chamada'}>
        {semCopia ? (
          <Estado icone={CloudOff} titulo="Esta turma não está no celular"
            texto="Sem internet agora, e esta turma nunca foi aberta neste aparelho. Abra a lista uma vez com internet: depois disso ela funciona mesmo sem sinal." />
        ) : q.isError && !q.data ? (
          <ErroTela erro={q.error} tentar={() => q.refetch()} />
        ) : (
          <Esqueleto n={6} />
        )}
      </Tela>
    );
  }
  return <ChamadaAberta key={turma} turma={turma} base={base} viaQr={!!qr} capa={capa} />;
}

function ChamadaAberta({ turma, base, viaQr, capa }: {
  turma: string; base: { d: Turma; em: number; copia: boolean }; viaQr: boolean;
  capa: (n?: string, r?: string, sub?: string) => React.ReactNode;
}) {
  const navigate = useNavigate();
  const { usuario } = useSessao();
  const fila = useFila();
  const d = base.d;
  const hoje = hojeISO();
  /* Cópia de outro dia: a data, o "já teve hoje" e o aniversário dela não valem para hoje. */
  const deHoje = d.data === hoje;
  const professores = d.professores || [];

  const [alunos, setAlunos] = useState<Presenca[]>(() => (d.alunos || []).map((n) => ({ aluno: n, status: 'Falta' })));
  /* Quem entrou com o login já vem escolhida, se estiver na equipe com a
     grafia da planilha. Cartão continua tocável: substituta troca num toque. */
  const [professor, setProfessor] = useState(() => {
    const k = semAcento(usuario?.nome);
    return professores.find((p) => semAcento(p) === k) || d.professorSugerido || '';
  });
  const [salvando, setSalvando] = useState(false);
  const [jaRegistradaServidor, setJaRegistrada] = useState(deHoje && d.jaRegistrada);
  const token = useRef(sorteioToken());
  const confirmouVazia = useRef(false);
  const forcar = useRef(false);

  /* Também conta como "já teve hoje" a chamada desta turma que está na
     fila, esperando internet. */
  const naFilaHoje = fila.some((i) => i.turma === turma && hojeISO(new Date(i.registro)) === hoje && i.token !== token.current);
  const jaRegistrada = jaRegistradaServidor || naFilaHoje;

  const presentes = alunos.filter((a) => a.status === 'Presente').length;
  const total = alunos.length;
  const faltas = total - presentes;
  const rotulo = faltas === 0 ? 'turma completa' : presentes === 0 ? 'toque em quem veio' : plural(faltas, 'faltou', 'faltaram');

  function escolherProf() {
    if (!professores.length) { toast('Nenhum professor cadastrado. Use a engrenagem na tela inicial.', 'erro'); return; }
    folha.opcoes('Quem está dando a aula', professores.map((nome) => ({
      txt: nome, ini: nome, marcado: nome === professor, fn: () => { setProfessor(nome); vibrar(); },
    })));
  }
  /* Sem professora conhecida a folha abre sozinha: é a primeira pergunta
     da aula, e assim o fluxo inteiro fecha em cinco toques. */
  useEffect(() => {
    if (!professor && professores.length && alunos.length) {
      const t = setTimeout(escolherProf, 340);
      return () => clearTimeout(t);
    }
  }, []);

  function ciclar(i: number) {
    setAlunos((l) => l.map((a, j) => (j === i ? { ...a, status: CICLO[a.status] } : a)));
    vibrar();
  }

  function todosPresentes() {
    const antes = alunos;
    if (antes.every((a) => a.status === 'Presente')) return;
    setAlunos(antes.map((a) => ({ ...a, status: 'Presente' })));
    vibrar();
    toast('Todos marcados como presentes', 'ok', { rotulo: 'Desfazer', fn: () => { setAlunos(antes); vibrar(); } });
  }

  function salvar() {
    if (!professor) { toast('Escolha quem está dando a aula', 'erro'); escolherProf(); return; }
    /* Com falta de ponto de partida, salvar sem tocar em ninguém dá falta
       para a turma inteira. Pode ser verdade, mas quase sempre é esquecimento. */
    if (!confirmouVazia.current && !alunos.some((a) => a.status !== 'Falta')) {
      folha.confirmar('Ninguém presente?',
        'Nenhum aluno foi marcado como presente. Se salvar assim, a turma inteira fica com falta.',
        'Salvar com todos em falta', () => { confirmouVazia.current = true; salvar(); });
      return;
    }
    if (jaRegistrada && !forcar.current) {
      folha.confirmar('Salvar de novo?',
        'Esta turma já teve chamada salva hoje. Salvar de novo cria um segundo registro e conta em dobro nos relatórios.',
        'Salvar assim mesmo', () => { forcar.current = true; salvar(); });
      return;
    }
    enviar();
  }

  async function enviar() {
    if (salvando) return;
    setSalvando(true);
    /* Primeiro no celular, depois na rede. Se o app fechar no meio do
       envio, a chamada não se perde: a fila manda de novo, com o mesmo
       token, e o servidor não duplica. */
    const item = await guardarNaFila({
      token: token.current, turma, professor, presencas: alunos, registro: Date.now(), forcar: forcar.current,
    });
    emMaos.add(item.token);
    const fim = (offline: boolean, resposta?: Resposta) => navigate({
      to: '/salva', replace: true,
      state: { chamada: { turma, offline, resposta, presentes, total, viaQr } },
    });
    try {
      if (!navigator.onLine) { pedirSincronizacao(); vibrar(); fim(true); return; }
      const r = await api<Resposta>('salvarChamada', [dadosDoItem(item)], { prazo: 30000 });
      await tirarDaFila(item.token);
      invalidarDepoisDe('salvarChamada');
      vibrar();
      fim(false, r);
    } catch (e) {
      if (ehErroRede(e) || e instanceof ErroConfig) {
        pedirSincronizacao(); vibrar(); fim(true); return;
      }
      /* Sessão caiu: a api já mandou para o login. A chamada fica na fila
         e vai sozinha depois que a pessoa entrar. */
      if (ehErroSessao(e)) return;
      await tirarDaFila(item.token);
      setSalvando(false);
      const msg = textoErro(e);
      /* Recusou por duplicidade: oferecer "tentar de novo" seria empurrar
         a professora para o erro que acabamos de evitar. */
      if (msg.startsWith('DUPLICADA')) { setJaRegistrada(true); toast('Esta turma já tem chamada salva hoje.', 'erro'); return; }
      toast(msg, 'erro');
    } finally {
      emMaos.delete(item.token);
    }
  }

  const sub = maiuscula(dataExtenso(hoje));
  if (!total) {
    return (
      <Tela titulo={turma} capa={capa('0', 'sem alunos', sub)} voltar={viaQr ? false : '/chamada'}>
        <Estado icone={Users} titulo="Turma sem alunos"
          texto={'Ninguém ativo em ' + turma + '. Na tela inicial, entre em Gestão para cadastrar.'} />
      </Tela>
    );
  }

  return (
    <Tela
      titulo={turma}
      capa={capa(presentes + '/' + total, rotulo, sub)}
      placar={<span aria-label={presentes + ' de ' + total + ' presentes'}>{presentes}/{total}</span>}
      voltar={viaQr ? false : '/chamada'}
      barra={
        <button type="button" onClick={salvar} disabled={salvando}
          className="flex min-h-13 baixo:min-h-11 baixo:py-2.5 w-full items-center justify-center gap-2 rounded-m bg-roxo p-4 text-[17px] font-bold tracking-tight text-white transition-colors duration-150 active:bg-roxo-fundo disabled:bg-roxo-apagado">
          {salvando ? 'Salvando…' : 'Salvar chamada'}
        </button>
      }
    >
      {base.copia && <FaixaSemInternet desde={base.em} />}

      {deHoje && d.aniversarios?.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-m border border-justif-borda bg-justif-fraco p-4 text-justif-tinta">
          <Cake size={22} className="shrink-0" />
          <div>
            <b className="mb-1 block text-[15px] font-bold">Aniversário hoje</b>
            {d.aniversarios.map((x) => (
              <span key={x.aluno} className="block text-sm leading-normal">{x.aluno} está fazendo {x.faz} anos</span>
            ))}
          </div>
        </div>
      )}

      {jaRegistrada && (
        <Aviso icone={CircleAlert}>
          {naFilaHoje && !jaRegistradaServidor
            ? 'Esta turma já tem chamada de hoje guardada no celular. Se salvar de novo, vai contar duas vezes.'
            : 'Esta turma já teve chamada salva hoje. Se salvar de novo, vai contar duas vezes.'}
        </Aviso>
      )}

      <button type="button" onClick={escolherProf}
        className={clsx(CARTAO, 'mb-5 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 active:bg-fundo')}>
        <User size={22} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <small className="block text-[13px] leading-tight text-apagado">Quem está dando a aula</small>
          <b className={clsx('block truncate text-base', professor ? 'font-semibold' : 'font-normal text-apagado')}>
            {professor || 'Escolher'}
          </b>
        </span>
        <ChevronRight size={20} className="shrink-0 text-apagado" />
      </button>

      <div className="mb-3 flex items-center justify-between gap-3 pl-1">
        <span className="text-sm text-apagado">Toque em quem veio</span>
        {faltas > 0 && (
          <button type="button" onClick={todosPresentes}
            className="-mr-1 min-h-11 rounded-p px-3 text-sm font-semibold text-roxo active:bg-roxo-fraco">
            Todos presentes
          </button>
        )}
      </div>

      <ListaAlunos alunos={alunos} onTocar={ciclar} />
    </Tela>
  );
}

/* A lista em si. Falta é o ponto de partida e fica quieta: selo cinza.
   Presença se destaca — fundo verde, avatar verde, visto. Numa sala
   barulhenta, o olho vê na hora quem ainda não foi marcado. */
function ListaAlunos({ alunos, onTocar }: { alunos: Presenca[]; onTocar: (i: number) => void }) {
  return (
    <Lista>
      {alunos.map((a, i) => {
        const tom = a.status === 'Presente' ? 'presente' : a.status === 'Justificada' ? 'justif' : 'falta';
        const falado = a.status === 'Presente' ? 'presente' : a.status === 'Falta' ? 'faltou' : 'falta justificada';
        return (
          <li key={a.aluno}
            role="button" tabIndex={0} aria-label={a.aluno + ', ' + falado}
            onClick={() => onTocar(i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTocar(i); } }}
            className={clsx(
              'relative flex min-h-16 cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-150 ease-curva',
              'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-17',
              'not-first:before:h-px not-first:before:bg-borda not-first:before:content-[""]',
              tom === 'presente' ? 'bg-presente-fraco active:bg-[#D3E8DC]'
                : tom === 'justif' ? 'bg-justif-fraco active:bg-[#F5EAD3]' : 'active:bg-roxo-fraco',
            )}>
            <Avatar nome={a.aluno} tom={tom} />
            <span className="min-w-0 flex-1 text-base leading-tight font-semibold [overflow-wrap:anywhere]">{a.aluno}</span>
            <span className="grid shrink-0 place-items-center">
              {a.status === 'Presente' ? (
                <span className="grid size-[26px] place-items-center rounded-full bg-presente text-white"><Check size={16} /></span>
              ) : (
                <span className={clsx('rounded-full px-3 py-1.5 text-[13px] font-bold whitespace-nowrap',
                  a.status === 'Falta' ? 'border border-borda bg-fundo text-apagado' : 'bg-justif text-white')}>
                  {a.status === 'Falta' ? 'Faltou' : 'Justificada'}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </Lista>
  );
}
