/* Tela inicial. Só aparece quando o app abre SEM ?turma=: o QR da parede
   continua caindo direto na lista de chamada, sem nenhuma tela no meio. */
import { createFileRoute, Link, redirect, useNavigate, useRouter } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  Calendar, ChevronRight, ClipboardList, Clock, CloudUpload, Download, KeyRound, LogOut, Medal, Package,
  Settings, Share, TriangleAlert, Wallet, type LucideIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { api, leitura, limparCache } from '../../api/cliente';
import { useSessao, esquecerSessao, sessaoAtual } from '../../sessao';
import { useFila, enviarAgora } from '../../offline/envio';
import { useInstalacao, instalar } from '../../offline/instalar';
import { Tela, Capa } from '../../ui/Tela';
import { CARTAO, Osso } from '../../ui/kit';
import { folha } from '../../ui/folha';
import { toast } from '../../ui/toast';
import { dataCurta, dataExtenso, hojeISO, maiuscula, plural, primeiroNome, reais, saudacao } from '../../util';

export const VERSAO = '4.0';

export type Destaque =
  | { tipo: 'aula'; turma: string; agora: boolean; hora: string }
  | { tipo: 'evento'; hoje: boolean; titulo: string; data: string; tipoEvento: string };
export type ResumoInicial = {
  turmas: number; proximo: { titulo: string; data: string } | null;
  saldo: number | null; materiais: number | null; destaque: Destaque | null;
};

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
  { to: '/agenda', ic: Calendar, t: 'Agenda', sub: (r) => (r?.proximo ? 'próximo: ' + r.proximo.titulo + ', ' + dataCurta(r.proximo.data) : '') },
  { to: '/caixa', ic: Wallet, t: 'Caixa', sub: (r) => (r?.saldo != null ? reais(r.saldo) + ' em caixa' : '') },
  { to: '/materiais', ic: Package, t: 'Materiais', sub: (r) => (r?.materiais ? plural(r.materiais, 'item', 'itens') : '') },
  { to: '/certificados', ic: Medal, t: 'Certificados' },
  { to: '/gestao', ic: Settings, t: 'Gestão', sub: () => 'turmas, alunos, equipe' },
];

function Inicio() {
  const { usuario } = useSessao();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const resumo = useQuery(leitura<ResumoInicial>('resumoInicial'));
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
    }, 300);
    return () => clearTimeout(t);
  }, [router, qc]);

  useEffect(() => {
    if (r?.destaque?.tipo === 'aula') qc.prefetchQuery(leitura('carregarTurma', r.destaque.turma));
  }, [r?.destaque, qc]);

  function sair() {
    folha.confirmar('Sair', 'Neste aparelho o app vai pedir e-mail e senha de novo.', 'Sair', async () => {
      const t = sessaoAtual();
      esquecerSessao();
      await limparCache();
      if (t) api('sair', []).catch(() => {});
      navigate({ to: '/entrar', replace: true });
    });
  }

  return (
    <Tela titulo="Início" voltar={false}
      capa={<Capa logo titulo={saudacao() + (nome ? ', ' + nome : '')} sub={dia} />}>
      <Pendencias />
      <CartaoDestaque carregando={resumo.isPending && !r} d={r?.destaque || null} />

      <ul className="grid grid-cols-2 gap-3">
        {BLOCOS.map((b) => (
          <li key={b.to}>
            <Link to={b.to}
              className={clsx(CARTAO, 'flex h-full min-h-30 w-full flex-col items-start gap-1 p-4 text-left',
                'transition-colors duration-150 ease-curva active:bg-fundo')}>
              <span className="mb-2 grid size-11 place-items-center rounded-full bg-roxo-fraco text-roxo"><b.ic size={22} /></span>
              <b className="text-[17px] leading-tight font-bold tracking-tight">{b.t}</b>
              {/* A linha reserva a altura desde o começo: o número chega depois e a grade não pula. */}
              <small className="line-clamp-2 min-h-[1.45em] text-[13px] leading-[1.45] text-apagado">{b.sub?.(r) || ''}</small>
            </Link>
          </li>
        ))}
      </ul>

      <Instalar />

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-m border border-borda bg-papel px-4 py-3.5">
        <span className="min-w-0 flex-[1_1_140px] truncate font-semibold">
          {usuario?.nome}<small className="block text-[13px] font-normal text-apagado">{usuario?.email}</small>
        </span>
        <BotaoRodape icone={KeyRound} onClick={() => navigate({ to: '/senha' })}>Trocar senha</BotaoRodape>
        <BotaoRodape icone={LogOut} onClick={sair}>Sair</BotaoRodape>
      </div>
      <p className="mt-8 mb-2 text-center text-xs text-apagado">Instituto Veridiana · versão {VERSAO}</p>
    </Tela>
  );
}

function BotaoRodape({ icone: Ic, children, onClick }: { icone: LucideIcon; children: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-borda bg-fundo px-3 text-sm font-semibold text-roxo">
      <Ic size={18} /> {children}
    </button>
  );
}

/* O atalho mais usado do sistema: a aula que deve estar começando, ou o
   evento de hoje. Um toque e está na chamada. */
function CartaoDestaque({ d, carregando }: { d: Destaque | null; carregando: boolean }) {
  const navigate = useNavigate();
  if (carregando) return <Osso className="mb-4 h-21 rounded-m" />;
  if (!d) return null;
  const aula = d.tipo === 'aula';
  const Ic = aula ? Clock : Calendar;
  const rotulo = aula ? (d.agora ? 'Aula agora' : 'Próxima aula') : d.hoje ? 'Hoje na agenda' : 'Próximo na agenda';
  const titulo = aula ? d.turma : d.titulo;
  const sub = aula
    ? (d.hora ? 'costuma começar às ' + d.hora : 'costuma ter aula hoje') + ' · abrir chamada'
    : (d.hoje ? '' : dataExtenso(d.data) + ' · ') + d.tipoEvento;
  return (
    <button type="button"
      onClick={() => aula
        ? navigate({ to: '/chamada/$turma', params: { turma: d.turma } })
        : navigate({ to: '/agenda', search: { mes: d.data.slice(0, 7) } })}
      className={clsx(CARTAO, 'mb-4 flex min-h-21 w-full items-center gap-3 border-l-4 border-l-roxo p-4 text-left',
        'transition-colors duration-150 ease-curva active:bg-fundo')}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-roxo text-white"><Ic size={22} /></span>
      <span className="min-w-0 flex-1">
        <small className="block text-xs font-bold tracking-[.06em] text-roxo uppercase">{rotulo}</small>
        <b className="mt-0.5 block text-lg leading-tight font-bold tracking-tight hyphens-auto [overflow-wrap:anywhere]">{titulo}</b>
        <span className="mt-0.5 block text-sm text-apagado">{sub}</span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-apagado" />
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
    if (!navigator.onLine) { toast('Ainda sem internet. Vai enviar sozinha quando voltar.', 'erro'); return; }
    const foram = await enviarAgora();
    if (!foram) toast('Não foi agora. Continua guardada no celular.', 'erro', { rotulo: 'Ver', fn: () => navigate({ to: '/pendentes' }) });
  }
  return (
    <div className={clsx('mb-4 rounded-m border px-4 py-3',
      travada ? 'border-falta/30 bg-falta-fraco text-falta' : 'border-justif-borda bg-justif-fraco text-justif-tinta')}>
      <div className="flex items-start gap-3">
        {travada ? <TriangleAlert size={20} className="mt-0.5 shrink-0" /> : <CloudUpload size={20} className="mt-0.5 shrink-0" />}
        <div className="min-w-0 flex-1 text-sm">
          <b className="block text-[15px]">
            {travada
              ? 'Chamada ainda não chegou na planilha'
              : plural(n, 'chamada esperando internet', 'chamadas esperando internet')}
          </b>
          {travada
            ? 'Está guardada no celular, mas não foi enviada. Veja o que está pendente.'
            : 'Está guardada no celular e vai enviar sozinha quando a internet voltar.'}
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={agora}
          className="min-h-11 flex-1 rounded-p bg-white/70 px-3 text-sm font-bold">Tentar agora</button>
        <button type="button" onClick={() => navigate({ to: '/pendentes' })}
          className="min-h-11 flex-1 rounded-p bg-white/70 px-3 text-sm font-bold">Ver pendentes</button>
      </div>
    </div>
  );
}

/* Discreto, abaixo da grade. Some quando já está instalado. */
function Instalar() {
  const s = useInstalacao();
  if (s === 'android') {
    return (
      <button type="button" onClick={() => instalar()}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-m text-sm font-semibold text-roxo active:bg-roxo-fraco">
        <Download size={18} /> Instalar o app
      </button>
    );
  }
  if (s === 'iphone') {
    return (
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[13px] text-apagado">
        Para instalar: <Share size={15} className="text-roxo" /> Compartilhar → Adicionar à Tela de Início
      </p>
    );
  }
  return null;
}
