/* A lista de chamada.

   Fluxo igual ao app HTML: abre com todo mundo em falta, um toque dá
   presença, o segundo falta justificada, o terceiro volta para falta.
   Professora já vem escolhida pelo login.

   Diferença do PWA: funciona sem internet. A lista vem da cópia guardada
   no celular (com a data na faixa do topo) e salvar sem conexão guarda
   a chamada na fila, que envia sozinha depois.

   Reabrir uma turma que já teve chamada hoje abre a CORREÇÃO: a lista
   vem com o que foi salvo, e salvar troca aquela chamada (substituir) em
   vez de somar outra. "É outra aula?" volta ao jeito antigo, para o caso
   real de duas aulas no mesmo dia. */
import { createFileRoute, useBlocker, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Cake, Check, ChevronRight, CloudOff, User, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { api, ehErroRede, ehErroSessao, invalidarDepoisDe, leitura, ErroConfig } from '../../../api/cliente';
import { guardarNaFila, tirarDaFila, dadosDoItem, type Presenca, type Resposta } from '../../../offline/fila';
import { emMaos, pedirSincronizacao, useFila } from '../../../offline/envio';
import { FaixaSemInternet, useOnline, usandoCopia } from '../../../offline/rede';
import { useSessao } from '../../../sessao';
import { Tela, Capa } from '../../../ui/Tela';
import { CARTAO_ELEVADO } from '../../../ui/Heroi';
import { Acoes } from '../../../ui/folha';
import { Avatar, Banner, BotaoCheio, Esqueleto, Estado, Lista } from '../../../ui/kit';
import { ErroTela } from '../../../ui/ErroTela';
import { folha } from '../../../ui/folha';
import { toast } from '../../../ui/toast';
import { dataExtenso, hojeISO, maiuscula, plural, primeiroNome, semAcento, sorteioToken, textoErro, vibrar } from '../../../util';

/* A chamada já salva hoje desta turma (Chamada.gs → chamadaPublica_). */
export type ChamadaDeHoje = { professor: string; hora: string; presencas: Presenca[]; varias: boolean };
export type Turma = {
  turma: string; alunos: string[]; professores: string[]; professorSugerido: string;
  data: string; jaRegistrada: boolean; aniversarios: { aluno: string; faz: number }[];
  chamadaDeHoje?: ChamadaDeHoje | null;
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
  /* Recente e não derrubada: depois de salvar, a cópia antiga (sem a
     chamada de hoje) não serve — "Corrigir" tem que mostrar o salvo. */
  const recente = !!q.data && !q.isStale && Date.now() - q.dataUpdatedAt < FRESCO;
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
        <span className="mt-1 block text-[13px] font-medium text-apagado">{r ?? ' '}</span>
      </>} />
  );

  if (!base) {
    const semCopia = !q.data && (q.fetchStatus === 'paused' || !online || (q.isError && ehErroRede(q.error)));
    return (
      <Tela titulo={turma} capa={capa()} voltar={qr ? false : '/chamada'}>
        {semCopia ? (
          <Estado icone={CloudOff} titulo="Esta turma ainda não está no celular"
            texto="Ela nunca foi aberta neste aparelho e agora está sem internet. Abra esta turma uma vez com internet: depois, a chamada funciona até sem sinal."
            botao={{ txt: 'Tentar de novo', fn: () => q.refetch() }} />
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

  /* A chamada salva hoje, se houver. Cópia de outro dia não vale. */
  const salvaHoje = deHoje ? d.chamadaDeHoje || null : null;
  /* Quem entrou com o login já vem escolhida, se estiver na equipe com a
     grafia da planilha. Cartão continua tocável: substituta troca num toque. */
  const profPadrao = () => {
    const k = semAcento(usuario?.nome);
    return professores.find((p) => semAcento(p) === k) || d.professorSugerido || '';
  };
  /* Corrigindo: cada aluno de hoje com o que foi salvo. Quem entrou na
     turma depois vem em falta; quem saiu da turma não aparece. */
  const marcasSalvas = (): Presenca[] => {
    const st = new Map((salvaHoje?.presencas || []).map((p) => [p.aluno, p.status]));
    return (d.alunos || []).map((n) => ({ aluno: n, status: st.get(n) || 'Falta' }));
  };
  const todosEmFalta = (): Presenca[] => (d.alunos || []).map((n) => ({ aluno: n, status: 'Falta' }));

  const [modo, setModo] = useState<'corrigir' | 'nova'>(salvaHoje ? 'corrigir' : 'nova');
  const corrigindo = modo === 'corrigir';
  const [alunos, setAlunos] = useState<Presenca[]>(() => (salvaHoje ? marcasSalvas() : todosEmFalta()));
  const [professor, setProfessor] = useState(() => (salvaHoje?.professor || profPadrao()));
  /* O ponto de partida do modo, para saber se a pessoa mudou alguma coisa. */
  const inicial = useRef(alunos.map((a) => a.status).join('|'));
  const [salvando, setSalvando] = useState(false);
  const [jaRegistradaServidor, setJaRegistrada] = useState(deHoje && d.jaRegistrada);
  const token = useRef(sorteioToken());
  const confirmouVazia = useRef(false);
  const forcar = useRef(false);

  /* Também conta como "já teve hoje" a chamada desta turma que está na
     fila, esperando internet. */
  const naFilaHoje = fila.some((i) => i.turma === turma && hojeISO(new Date(i.registro)) === hoje && i.token !== token.current);
  const jaRegistrada = !corrigindo && (jaRegistradaServidor || naFilaHoje);

  const presentes = alunos.filter((a) => a.status === 'Presente').length;
  const justificadas = alunos.filter((a) => a.status === 'Justificada').length;
  const total = alunos.length;
  /* Justificada é ausência, mas conta à parte: a conversa com a família é outra. */
  const faltas = total - presentes - justificadas;
  const rotulo = presentes === total ? 'turma completa'
    : presentes === 0 && justificadas === 0 ? 'presentes'
      : [faltas ? plural(faltas, 'faltou', 'faltaram') : '', justificadas ? plural(justificadas, 'justificada', 'justificadas') : '']
        .filter(Boolean).join(' · ');

  /* Saiu sem salvar (botão voltar, gesto da borda, voltar do sistema,
     fechar a aba) depois de marcar alguém: pergunta antes de jogar fora.
     Sem marcação nenhuma ou depois de salvar, sai direto. A folha comum
     entra no histórico com o mesmo endereço: essa navegação não conta. */
  const tocou = useRef(false);
  const saiuSalvando = useRef(false);
  const marcou = () => tocou.current && !saiuSalvando.current && (corrigindo
    ? alunos.map((a) => a.status).join('|') !== inicial.current   // corrigindo: só se mudou algo do salvo
    : alunos.some((a) => a.status !== 'Falta'));
  const bloqueio = useBlocker({
    shouldBlockFn: ({ current, next }) => current.pathname !== next.pathname && marcou(),
    enableBeforeUnload: () => marcou(),
    withResolver: true,
  });
  /* A pergunta aparece como folha, mas não é a folha do app: no voltar do
     sistema o roteador está com o endereço já voltado enquanto espera a
     resposta, e a folha comum mexe no histórico. Esta fica só na tela. */
  const perguntando = bloqueio.status === 'blocked';

  function escolherProf() {
    if (!professores.length) { toast('Ninguém da equipe cadastrado ainda. Peça para a gestão cadastrar em Gestão → Equipe.', 'erro'); return; }
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
    tocou.current = true;
    setAlunos((l) => l.map((a, j) => (j === i ? { ...a, status: CICLO[a.status] } : a)));
    vibrar();
  }

  function todosPresentes() {
    const antes = alunos;
    if (antes.every((a) => a.status === 'Presente')) return;
    tocou.current = true;
    setAlunos(antes.map((a) => ({ ...a, status: 'Presente' })));
    vibrar();
    toast('Todos marcados como presentes', 'ok', { rotulo: 'Desfazer', fn: () => { setAlunos(antes); vibrar(); } });
  }

  /* "É outra aula?": larga a correção e começa uma chamada nova, com o
     aviso de que a turma já tem chamada hoje e o "Salvar de novo". */
  function outraAula() {
    const nova = todosEmFalta();
    setModo('nova');
    setAlunos(nova);
    setProfessor(profPadrao());
    inicial.current = nova.map((a) => a.status).join('|');
    tocou.current = false;
    forcar.current = false;
    confirmouVazia.current = false;
    setJaRegistrada(true);
    vibrar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function salvar() {
    /* Sem toast: a folha de escolha já abre e diz o que falta. */
    if (!professor) { vibrar(); escolherProf(); return; }
    /* Com falta de ponto de partida, salvar sem tocar em ninguém dá falta
       para a turma inteira. Pode ser verdade, mas quase sempre é esquecimento. */
    if (!confirmouVazia.current && !alunos.some((a) => a.status !== 'Falta')) {
      folha.confirmar('Ninguém presente?',
        'Ninguém foi marcado como presente. Se salvar assim, a turma inteira fica com falta hoje.',
        'Salvar com faltas', () => { confirmouVazia.current = true; salvar(); });
      return;
    }
    if (jaRegistrada && !forcar.current) {
      folha.confirmar('Salvar de novo?',
        'Esta turma já tem chamada hoje. Só salve de novo se for outra aula: senão ela conta duas vezes nos relatórios.',
        'Salvar de novo', () => { forcar.current = true; salvar(); });
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
      substituir: corrigindo || undefined,
    });
    emMaos.add(item.token);
    /* Já está guardada no celular: sair daqui não perde nada. */
    saiuSalvando.current = true;
    const fim = (offline: boolean, resposta?: Resposta) => navigate({
      to: '/salva', replace: true,
      state: { chamada: { turma, offline, resposta, presentes, total, justificadas, viaQr, corrigida: corrigindo } },
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
      saiuSalvando.current = false;
      setSalvando(false);
      const msg = textoErro(e);
      /* Recusou por duplicidade: oferecer "tentar de novo" seria empurrar
         a professora para o erro que acabamos de evitar. */
      if (msg.startsWith('DUPLICADA')) {
        setJaRegistrada(true);
        toast('Outra pessoa já salvou a chamada desta turma hoje. Confira o aviso no topo.', 'erro');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
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
          texto={'Ainda não tem ninguém na lista de ' + turma + '. Peça para a gestão cadastrar os alunos em Gestão → Turmas.'} />
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
        <BotaoCheio onClick={salvar} carregando={salvando}
          className="text-[17px] tracking-tight baixo:min-h-11 baixo:py-2.5">
          {salvando ? 'Salvando…' : corrigindo ? 'Salvar correção' : 'Salvar chamada'}
        </BotaoCheio>
      }
    >
      {base.copia && <FaixaSemInternet desde={base.em} />}

      {deHoje && d.aniversarios?.length > 0 && (
        <Banner tom="sucesso" icone={Cake} titulo={d.aniversarios.length === 1 ? 'Aniversário hoje' : d.aniversarios.length + ' aniversários hoje'}>
          {d.aniversarios.map((x) => (
            <span key={x.aluno} className="block">{x.aluno} está fazendo {x.faz} anos</span>
          ))}
        </Banner>
      )}

      {/* Corrigindo: diz de quem é a chamada que vai ser trocada, e que ela
          não conta duas vezes. A saída para a outra aula fica discreta. */}
      {corrigindo && salvaHoje && (
        <Banner tom="info" titulo="Corrigindo a chamada de hoje" className="py-2.5">
          {salvaHoje.varias
            ? 'Esta turma tem mais de uma chamada hoje. Ao salvar, a mais recente (feita por ' + primeiroNome(salvaHoje.professor) + (salvaHoje.hora ? ' às ' + salvaHoje.hora : '') + ') é trocada.'
            : 'Feita por ' + primeiroNome(salvaHoje.professor) + (salvaHoje.hora ? ' às ' + salvaHoje.hora : '') + '. Ao salvar, ela é trocada — não conta duas vezes.'}
          <button type="button" onClick={outraAula}
            className="-ml-2 mt-0.5 block min-h-11 rounded-p px-2 text-left text-sm font-bold text-roxo underline active:bg-black/5">
            É outra aula? Começar uma chamada nova
          </button>
        </Banner>
      )}

      {/* Curto: com a letra grande, o primeiro aluno ainda aparece sem rolar.
          O porquê fica a um toque. */}
      {jaRegistrada && (
        <Banner tom="atencao" className="py-2.5">
          <b>Já tem chamada hoje.</b> Salvar de novo duplica a aula.{' '}
          <button type="button" className="-my-3 inline-block min-h-11 px-1 font-bold underline"
            onClick={() => folha.abrir('Por que conta duas vezes?', (fechar) => (
              <>
                <p className="mx-2 mb-3 text-[15px] leading-normal">
                  {naFilaHoje && !jaRegistradaServidor
                    ? 'A chamada desta turma de hoje está guardada neste celular, esperando internet. Se salvar outra, a planilha recebe as duas.'
                    : 'A planilha já recebeu a chamada desta turma hoje. Se salvar outra, os relatórios contam duas aulas. Só salve se foi mesmo outra aula.'}
                </p>
                <Acoes rotulo="Entendi" perigo={false} rotuloCancelar="Fechar" onCancelar={fechar} onConfirmar={fechar} />
              </>
            ))}>
            Por quê?
          </button>
        </Banner>
      )}

      {/* O cartão principal da tela (DNA: elevado, ícone em quadrado roxo). */}
      <button type="button" onClick={escolherProf}
        className={clsx(CARTAO_ELEVADO, 'mb-3 flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 active:bg-fundo')}>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-roxo text-white"><User size={20} /></span>
        <span className="min-w-0 flex-1">
          <small className="block text-xs font-bold tracking-[.06em] text-roxo uppercase">Quem dá a aula</small>
          <b className={clsx('line-clamp-2 block text-base leading-snug', professor ? 'font-semibold' : 'font-normal text-apagado')}>
            {professor || 'Escolher'}
          </b>
        </span>
        <ChevronRight size={20} className="shrink-0 text-apagado" />
      </button>

      {/* Cabeçalho de seção do DNA: versalete à esquerda, ação à direita.
          Embaixo, a legenda do toque: o 2º toque (justificada) não se
          descobre sozinho. */}
      <div className="flex min-h-11 items-center justify-between gap-3 pl-4">
        <h2 className="text-[13px] font-semibold tracking-wide text-apagado uppercase">Alunos</h2>
        {presentes < total && (
          <button type="button" onClick={todosPresentes}
            className="-mr-1 min-h-11 rounded-p px-2 text-sm font-bold text-roxo active:bg-roxo-fraco">
            Todos presentes
          </button>
        )}
      </div>

      <p className="mb-2 flex flex-wrap gap-x-2 gap-y-0.5 pl-4 text-xs leading-snug text-apagado" id="legendaToque">
        <span>Toque em quem veio:</span>
        <span><b className="text-presente">1 toque</b> veio</span>
        <span aria-hidden="true">·</span>
        <span><b className="text-justif-tinta">2</b> justificada</span>
        <span aria-hidden="true">·</span>
        <span><b>3</b> falta</span>
      </p>

      <ListaAlunos alunos={alunos} onTocar={ciclar} />
      {perguntando && (
        <PerguntaSair onSair={() => bloqueio.proceed?.()} onFicar={() => bloqueio.reset?.()} />
      )}
    </Tela>
  );
}

/* A lista em si. Falta é o ponto de partida e fica quieta: selo cinza.
   Presença se destaca — fundo verde, avatar verde, visto. Numa sala
   barulhenta, o olho vê na hora quem ainda não foi marcado. */
function ListaAlunos({ alunos, onTocar }: { alunos: Presenca[]; onTocar: (i: number) => void }) {
  return (
    <Lista className="rounded-2xl">
      {alunos.map((a, i) => {
        const tom = a.status === 'Presente' ? 'presente' : a.status === 'Justificada' ? 'justif' : 'falta';
        const falado = a.status === 'Presente' ? 'presente' : a.status === 'Falta' ? 'faltou' : 'falta justificada';
        return (
          /* Item de lista com um botão dentro: o leitor de tela anuncia
             "item 3 de 18" e o botão, com nome e estado. */
          <li key={a.aluno}
            className={clsx('relative',
              'not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-17',
              'not-first:before:z-1 not-first:before:h-px not-first:before:bg-borda not-first:before:content-[""]')}>
            <button type="button" aria-label={a.aluno + ', ' + falado} onClick={() => onTocar(i)}
              className={clsx(
                'flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ease-curva',
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
            </button>
          </li>
        );
      })}
    </Lista>
  );
}

/* "Sair sem salvar?" — com a cara da folha do app, sem entrar no histórico. */
function PerguntaSair({ onSair, onFicar }: { onSair: () => void; onFicar: () => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const foco = document.activeElement as HTMLElement | null;
    caixa.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onFicar(); };
    document.addEventListener('keydown', k);
    const corpo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = corpo; foco?.focus({ preventScroll: true }); };
  }, [onFicar]);
  return (
    <>
      <div onClick={onFicar} aria-hidden="true" className="fixed inset-0 z-40 touch-none bg-tinta/50" />
      <div ref={caixa} role="alertdialog" aria-modal="true" aria-labelledby="sairTitulo" aria-describedby="sairTexto"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[644px] rounded-t-g bg-papel px-3 pt-2 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <div className="mx-auto mt-1 mb-3 h-1 w-[38px] rounded-full bg-[#D9CFE2]" />
        <h2 id="sairTitulo" className="mx-2 mb-2 text-[17px] font-bold tracking-tight">Sair sem salvar?</h2>
        <p id="sairTexto" className="mx-2 mb-3 text-sm text-apagado">As marcações desta chamada vão se perder.</p>
        <Acoes rotulo="Sair sem salvar" rotuloCancelar="Continuar a chamada" onCancelar={onFicar} onConfirmar={onSair} />
      </div>
    </>
  );
}
