/* Tela inicial. Só aparece quando o app abre SEM ?turma=: o QR da parede
   continua caindo direto na lista de chamada, sem nenhuma tela no meio. */
import { createFileRoute, Link, redirect, useNavigate, useRouter } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  CalendarDays, CalendarPlus, Calendar, Check, ChevronRight, ClipboardCheck, ClipboardList, Clock, CloudUpload,
  Download, KeyRound, LogOut, Medal, Package, Settings, Share, TriangleAlert, Wallet, type LucideIcon,
} from 'lucide-react';
import { Atalhos, BotaoHeroi, CabecalhoSecao, CARTAO_ELEVADO, Corpo, Heroi, Sobreposto, type Atalho } from '../../ui/Heroi';
import { clsx } from 'clsx';
import { api, leitura, limparCache } from '../../api/cliente';
import { useSessao, esquecerSessao, sessaoAtual } from '../../sessao';
import { useFila, enviarAgora } from '../../offline/envio';
import { useInstalacao, instalar } from '../../offline/instalar';
import { Tela } from '../../ui/Tela';
import { Avatar, Banner, CARTAO, GrupoNav, Osso } from '../../ui/kit';
import { folha } from '../../ui/folha';
import { toast } from '../../ui/toast';
import { dataCurta, dataExtenso, hojeISO, iniciais, maiuscula, plural, primeiroNome, reais, saudacao } from '../../util';

export const VERSAO = '4.0';

export type Destaque =
  | { tipo: 'aula'; turma: string; agora: boolean; hora: string; origem?: 'grade'; fim?: string; sala?: string; professor?: string }
  | { tipo: 'evento'; hoje: boolean; titulo: string; data: string; tipoEvento: string };
export type ResumoInicial = {
  turmas: number; proximo: { titulo: string; data: string } | null;
  saldo: number | null; materiais: number | null; destaque: Destaque | null;
};

/* O pedaço da grade que a tela inicial usa (Grade.gs → listarGrade). */
type HorarioHoje = { id: string; turma: string; dia: number; inicio: string; fim: string; sala: string; professor: string };
type GradeResumo = { dia: number; horarios: HorarioHoje[]; feitasHoje: string[] };

export const Route = createFileRoute('/_app/')({
  /* QR antigo apontado para o Vercel (/?turma=Ballet) cai direto na turma. */
  validateSearch: (s: Record<string, unknown>): { turma?: string } =>
    typeof s.turma === 'string' && s.turma ? { turma: s.turma.slice(0, 120) } : {},
  beforeLoad: ({ search }) => {
    if (search.turma) throw redirect({ to: '/chamada/$turma', params: { turma: search.turma }, search: { qr: 1 }, replace: true });
  },
  component: Inicio,
});

type Bloco = { to: string; ic: LucideIcon; t: string; sub?: (r?: ResumoInicial) => string };
const BLOCOS: Bloco[] = [
  { to: '/chamada', ic: ClipboardList, t: 'Chamada', sub: (r) => (r?.turmas ? plural(r.turmas, 'turma', 'turmas') : '') },
  { to: '/agenda', ic: Calendar, t: 'Agenda', sub: (r) => (r?.proximo ? dataCurta(r.proximo.data) + ' · ' + r.proximo.titulo : '') },
  { to: '/caixa', ic: Wallet, t: 'Caixa', sub: (r) => (r?.saldo != null ? reais(r.saldo) + ' em caixa' : '') },
  { to: '/materiais', ic: Package, t: 'Materiais', sub: (r) => (r?.materiais ? plural(r.materiais, 'item', 'itens') : '') },
  { to: '/certificados', ic: Medal, t: 'Certificados' },
  { to: '/gestao', ic: Settings, t: 'Gestão', sub: () => 'turmas e equipe' },
];

/* Atalhos para o que se faz toda semana, ao alcance do polegar (como os
   botões redondos dos apps de banco). As seções inteiras ficam na grade
   de baixo e nas abas. */
const ATALHOS: Atalho[] = [
  { to: '/chamada', icone: ClipboardCheck, texto: 'Fazer chamada' },
  { to: '/grade', icone: CalendarDays, texto: 'Grade de aulas' },
  { to: '/agenda/evento', icone: CalendarPlus, texto: 'Novo evento' },
  { to: '/caixa', icone: Wallet, texto: 'Lançar no caixa' },
];

function Inicio() {
  const { usuario } = useSessao();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const resumo = useQuery(leitura<ResumoInicial>('resumoInicial'));
  const instalacao = useInstalacao();
  const r = resumo.data;
  const nome = primeiroNome(usuario?.nome);
  const dia = maiuscula(dataExtenso(hojeISO()));

  /* Tela já pintada: agora sim vale buscar o resto em segundo plano, para
     a próxima tela abrir sem espera — o código das seções e os dados das
     mais usadas. Dados da gestão NÃO vão por trás: o alerta de faltas lê
     120 dias de chamadas. Quem só veio fazer chamada não paga isso. */
  useEffect(() => {
    const t = setTimeout(() => {
      ['/chamada', '/agenda', '/materiais', '/gestao'].forEach((to) => router.preloadRoute({ to }).catch(() => {}));
      qc.prefetchQuery(leitura('listarTurmas'));
      const h = hojeISO();
      qc.prefetchQuery(leitura('listarAgenda', +h.slice(0, 4), +h.slice(5, 7)));
      qc.prefetchQuery(leitura('listarMateriais', {}));
      router.preloadRoute({ to: '/grade' as string }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [router, qc]);

  useEffect(() => {
    if (r?.destaque?.tipo === 'aula') qc.prefetchQuery(leitura('carregarTurma', r.destaque.turma));
  }, [r?.destaque, qc]);

  function sair() {
    folha.confirmar('Sair deste celular?',
      'Na próxima vez o app vai pedir seu e-mail e senha. Chamada guardada esperando internet continua aqui e vai ser enviada.',
      'Sair', async () => {
      const t = sessaoAtual();
      esquecerSessao();
      await limparCache();
      if (t) api('sair', []).catch(() => {});
      navigate({ to: '/entrar', replace: true });
    });
  }

  function conta() {
    folha.opcoes(usuario?.nome || 'Sua conta', [
      { txt: 'Trocar senha', icone: KeyRound, fn: () => navigate({ to: '/senha' }) },
      { txt: 'Sair deste celular', icone: LogOut, perigo: true, fn: sair },
    ]);
  }

  return (
    <Tela titulo="Início" voltar={false} roxo solto
      capa={<Topo nome={nome} dia={dia} usuario={usuario?.nome || ''} onConta={conta} />}>
      <Sobreposto>
        <CartaoDestaque carregando={resumo.isPending && !r} d={r?.destaque || null} />
      </Sobreposto>
      <Corpo>
      <Pendencias />

      <Atalhos itens={ATALHOS} />

      <HojeNaGrade />

      <CabecalhoSecao titulo="Seções" />
      {/* Compacta: ícone ao lado do nome, o número embaixo. A altura é fixa
          desde o começo: o número chega depois e a grade não pula. */}
      <ul className="grid grid-cols-2 gap-2.5">
        {BLOCOS.map((b) => (
          <li key={b.to}>
            <Link to={b.to}
              className={clsx(CARTAO, 'flex h-full min-h-[76px] w-full items-center gap-3 px-3.5 py-3 text-left',
                'transition-colors duration-150 ease-curva active:bg-fundo')}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-roxo-fraco text-roxo"><b.ic size={21} /></span>
              <span className="min-w-0">
                <b className="block text-[15px] leading-tight font-bold tracking-tight">{b.t}</b>
                <small className="mt-0.5 line-clamp-2 min-h-[1.3em] text-xs leading-[1.3] text-apagado">{b.sub?.(r) || ''}</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Conta no fim, como nos Ajustes do celular: quem entrou, trocar
          senha, sair. O convite de instalar mora aqui também, discreto. */}
      <div className="mt-7">
        <CabecalhoSecao titulo="Sua conta" />
        <div className={clsx(CARTAO, 'mb-2 flex items-center gap-3 px-4 py-3')}>
          <Avatar nome={usuario?.nome || '?'} />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-base">{usuario?.nome}</b>
            <small className="block truncate text-[13px] text-apagado">{usuario?.email}</small>
          </span>
        </div>
        <GrupoNav itens={[
          ...(instalacao === 'android' ? [{ icone: Download, titulo: 'Instalar o app', sub: 'ícone na tela inicial, abre até sem internet', onClick: () => { instalar(); } }] : []),
          { icone: KeyRound, titulo: 'Trocar senha', onClick: () => navigate({ to: '/senha' }) },
          { icone: LogOut, titulo: 'Sair deste celular', onClick: sair },
        ]} />
        {instalacao === 'iphone' && (
          <p className="mx-4 flex flex-wrap items-center gap-1 text-[13px] leading-snug text-apagado">
            Para instalar no iPhone: <Share size={14} className="text-roxo" /> Compartilhar → Adicionar à Tela de Início.
          </p>
        )}
      </div>
      <p className="mt-6 mb-2 text-center text-xs text-apagado">Instituto Veridiana · versão {VERSAO}</p>
      </Corpo>
    </Tela>
  );
}

/* O atalho mais usado do sistema: a aula que deve estar começando, ou o
   evento de hoje. Um toque e está na chamada. */
function CartaoDestaque({ d, carregando }: { d: Destaque | null; carregando: boolean }) {
  const navigate = useNavigate();
  if (carregando) return <Osso className="h-21 rounded-2xl shadow-cartao" />;
  if (!d) return <div className="h-12" aria-hidden="true" />;
  const aula = d.tipo === 'aula';
  const Ic = aula ? Clock : Calendar;
  const rotulo = aula ? (d.agora ? 'Aula agora' : 'Próxima aula') : d.hoje ? 'Hoje na agenda' : 'Próximo na agenda';
  const titulo = aula ? d.turma : d.titulo;
  /* Pela grade é a hora certa ("começa às"); pelo palpite das chamadas,
     "costuma começar às". */
  const sala = aula && d.sala ? ' · ' + d.sala : '';
  const sub = aula
    ? d.origem === 'grade'
      ? (d.agora ? 'agora · até ' + d.fim : 'começa às ' + d.hora) + sala
      : (d.hora ? 'costuma começar às ' + d.hora : 'costuma ter aula hoje')
    : (d.hoje ? '' : dataExtenso(d.data) + ' · ') + d.tipoEvento;
  return (
    <button type="button"
      onClick={() => aula
        ? navigate({ to: '/chamada/$turma', params: { turma: d.turma } })
        : navigate({ to: '/agenda', search: { mes: d.data.slice(0, 7) } })}
      className={clsx(CARTAO_ELEVADO, 'flex min-h-21 w-full items-center gap-3 p-4 text-left transition-colors duration-150 ease-curva active:bg-fundo')}>
      <span className={clsx('relative grid size-12 shrink-0 place-items-center rounded-2xl text-white', aula && d.agora ? 'bg-presente' : 'bg-roxo')}>
        <Ic size={24} />
        {/* Pulso só na aula que está acontecendo: "é agora". */}
        {aula && d.agora && <span className="absolute -top-1 -right-1 size-3.5 rounded-full border-2 border-papel bg-presente motion-safe:animate-pulse" />}
      </span>
      <span className="min-w-0 flex-1">
        <small className={clsx('block text-xs font-bold tracking-[.06em] uppercase', aula && d.agora ? 'text-presente' : 'text-roxo')}>{rotulo}</small>
        <b className="mt-0.5 block text-lg leading-tight font-bold tracking-tight hyphens-auto [overflow-wrap:anywhere]">{titulo}</b>
        <span className="mt-0.5 block text-sm text-apagado">{sub}</span>
      </span>
      {aula
        ? <span className="shrink-0 rounded-full bg-roxo px-3.5 py-2 text-sm font-bold text-white">Chamada</span>
        : <ChevronRight size={20} className="shrink-0 text-apagado" />}
    </button>
  );
}

/* Chamada guardada no celular esperando internet. Enquanto houver, a
   tela inicial avisa. Depois de 3 tentativas, ou se alguma precisa de
   decisão, o aviso muda de tom. */
function Pendencias() {
  const itens = useFila();
  const navigate = useNavigate();
  if (!itens.length) return null;
  const travada = itens.some((i) => i.situacao !== 'pendente' || i.tentativas >= 3);
  const n = itens.length;
  async function agora() {
    if (!navigator.onLine) { toast('Ainda sem internet. Vai enviar sozinha quando voltar.', 'info'); return; }
    const foram = await enviarAgora();
    if (!foram) toast('Não foi agora. Continua guardada no celular.', 'info', { rotulo: 'Ver', fn: () => navigate({ to: '/pendentes' }) });
  }
  /* Banner com o peso certo: esperando internet é atenção (vai sozinha);
     travada é erro (precisa de alguém olhar). */
  return (
    <Banner tom={travada ? 'erro' : 'atencao'} icone={travada ? TriangleAlert : CloudUpload}
      titulo={travada ? 'Uma chamada não chegou na planilha'
        : plural(n, 'chamada esperando internet', 'chamadas esperando internet')}>
      {travada
        ? 'Ela está guardada neste celular, mas precisa que alguém confira antes de enviar.'
        : 'Está guardada neste celular e vai ser enviada sozinha quando a internet voltar.'}
      <span className="-ml-2 mt-1 flex flex-wrap gap-x-1">
        {!travada && (
          <button type="button" onClick={agora}
            className="min-h-11 rounded-p px-2 text-sm font-bold text-justif-tinta active:bg-black/5">Tentar agora</button>
        )}
        <button type="button" onClick={() => navigate({ to: '/pendentes' })}
          className={clsx('min-h-11 rounded-p px-2 text-sm font-bold active:bg-black/5', travada ? 'text-falta' : 'text-justif-tinta')}>
          {travada ? 'Ver o que falta' : 'Ver pendentes'}
        </button>
      </span>
    </Banner>
  );
}

/* O topo: saudação grande no roxo de marca, a bailarina do logo ao fundo
   bem apagada, a data numa pílula e a linha do dia. Embaixo fica espaço
   para o cartão de destaque se sobrepor à borda (pt do conteúdo é negativo). */
function Topo({ nome, dia, usuario, onConta }: { nome: string; dia: string; usuario: string; onConta: () => void }) {
  const grade = useQuery(leitura<GradeResumo>('listarGrade'));
  const g = grade.data;
  const deHoje = g ? g.horarios.filter((h) => h.dia === g.dia) : [];
  const feitas = g ? deHoje.filter((h) => g.feitasHoje.includes(h.turma)).length : 0;
  const linhaDoDia = !g ? '' : deHoje.length
    ? plural(deHoje.length, 'aula hoje', 'aulas hoje') + (feitas ? ' · ' + feitas + ' com chamada feita' : '')
    : 'Nenhuma aula na grade hoje';
  return (
    <Heroi sobre={saudacao() + (nome ? ',' : '')} titulo={nome || 'Olá'}
      direita={<BotaoHeroi rotulo={'Conta de ' + usuario} onClick={onConta}>{iniciais(usuario)}</BotaoHeroi>}
      pilulas={[{ icone: Calendar, texto: dia }, !!linhaDoDia && { icone: Clock, texto: linhaDoDia }]} />
  );
}

/* As aulas de hoje pela grade, das que estão acontecendo às próximas.
   Estado escrito (não só cor). Sem grade para hoje, não aparece. */
function HojeNaGrade() {
  const navigate = useNavigate();
  const g = useQuery(leitura<GradeResumo>('listarGrade')).data;
  if (!g) return null;
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const min = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const deHoje = g.horarios.filter((h) => h.dia === g.dia).sort((a, b) => min(a.inicio) - min(b.inicio));
  if (!deHoje.length) return null;
  /* As que ainda vão acontecer (ou estão acontecendo) primeiro; até 4. */
  const vindo = deHoje.filter((h) => min(h.fim) >= agoraMin);
  const lista = (vindo.length ? vindo : deHoje).slice(0, 4);
  return (
    <section className="mb-6">
      <CabecalhoSecao titulo="Hoje na grade" acao={{ txt: 'Ver semana', onClick: () => navigate({ to: '/grade' as string }) }} />
      <ul className={clsx(CARTAO, 'overflow-hidden')}>
        {lista.map((h) => {
          const feita = g.feitasHoje.includes(h.turma);
          const agora = agoraMin >= min(h.inicio) - 30 && agoraMin <= min(h.fim);
          const passou = agoraMin > min(h.fim);
          const estado = feita ? 'Chamada feita' : agora ? 'Agora' : passou ? 'Já passou' : 'Mais tarde';
          return (
            <li key={h.id} className="relative not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-[84px] not-first:before:h-px not-first:before:bg-borda not-first:before:content-['']">
              <button type="button" onClick={() => navigate({ to: '/chamada/$turma', params: { turma: h.turma } })}
                className="flex min-h-15 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-roxo-fraco/60">
                <span className="w-14 shrink-0 text-center leading-tight">
                  <b className="block text-[15px] tabular-nums">{h.inicio}</b>
                  <small className="block text-xs text-apagado tabular-nums">{h.fim}</small>
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-base leading-tight">{h.turma}</b>
                  <small className="block truncate text-[13px] text-apagado">{[h.sala, h.professor].filter(Boolean).join(' · ') || 'sem sala definida'}</small>
                </span>
                <span className={clsx('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                  feita ? 'bg-presente-fraco text-presente' : agora ? 'bg-presente text-white' : 'bg-fundo text-apagado')}>
                  {feita && <Check size={13} strokeWidth={3} />}{estado}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
