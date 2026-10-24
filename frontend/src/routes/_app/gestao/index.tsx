/* Gestão, tela raiz (aba). Mesmo DNA do Início (DESIGN.md §16): topo
   roxo com o resumo do instituto, o cartão do que pede ação agora por
   cima da borda, atalhos para os cadastros e os grupos do resto.

   Os contadores chegam depois da tela, cada um por si: ler Chamadas para
   o alerta de faltas custa caro e não pode segurar o menu. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, CalendarClock, Cake, Calendar, Check, ClipboardList, FileText, Medal, Package, QrCode, Sheet, User, Users, Wallet,
} from 'lucide-react';
import { clsx } from 'clsx';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Banner, GrupoNav, Osso, type ItemNav } from '../../../ui/kit';
import {
  Atalhos, BotaoHeroi, CabecalhoSecao, CARTAO_ELEVADO, Corpo, Heroi, Sobreposto, type Atalho,
} from '../../../ui/Heroi';
import { dataCurta, plural } from '../../../util';
import type { Aniversario, ResumoGestao } from './-comum';

export const Route = createFileRoute('/_app/gestao/')({ component: Gestao });

/* Os cadastros do dia a dia, ao alcance do polegar. */
const ATALHOS: Atalho[] = [
  { to: '/gestao/turmas', icone: ClipboardList, texto: 'Turmas' },
  { to: '/gestao/alunos', icone: Users, texto: 'Alunos' },
  { to: '/gestao/equipe', icone: User, texto: 'Equipe' },
  { to: '/grade', icone: CalendarClock, texto: 'Grade de aulas' },
];

function Gestao() {
  const navigate = useNavigate();
  const g = useQuery(leitura<ResumoGestao>('entrarNaGestao')).data;
  const risco = useQuery(leitura<number>('contarRisco')).data;
  const aniv = useQuery(leitura<Aniversario[]>('aniversariantesSemana')).data;

  const ir = (to: string) => () => navigate({ to });
  const atencao = risco === undefined ? 'carregando…'
    : risco === 0 ? 'ninguém faltando seguido, ótimo'
      : <span className="text-falta">{plural(risco, 'aluno faltou', 'alunos faltaram')} 3 aulas seguidas</span>;

  /* Cadastros (turmas, alunos, equipe, grade) já estão nos atalhos; os
     grupos ficam com o resto, agrupado por assunto como nos Ajustes. */
  const grupos: { titulo: string; itens: ItemNav[] }[] = [
    { titulo: 'Acompanhamento', itens: [
      { icone: Bell, titulo: 'Precisam de atenção', sub: atencao, onClick: ir('/gestao/risco') },
      { icone: Calendar, titulo: 'Histórico', sub: 'quem veio, por dia e por mês', onClick: ir('/gestao/historico') },
      { icone: FileText, titulo: 'Relatório para edital', sub: 'beneficiários, aulas e frequência', onClick: ir('/gestao/relatorio') },
    ] },
    { titulo: 'Instituto', itens: [
      { icone: Package, titulo: 'Materiais', sub: 'figurinos, cenário, bazar', onClick: ir('/materiais') },
      { icone: Medal, titulo: 'Certificados', sub: 'comprovante de horas para as alunas', onClick: ir('/certificados') },
      { icone: Wallet, titulo: 'Caixa', sub: 'entradas, saídas e comprovantes', onClick: ir('/caixa') },
    ] },
    { titulo: 'Ferramentas', itens: [
      { icone: QrCode, titulo: 'QR do app', sub: 'cartaz para abrir o app no celular', onClick: ir('/gestao/qr') },
      { icone: Sheet, titulo: 'Planilha', sub: 'abrir e compartilhar a planilha', onClick: ir('/gestao/planilha') },
    ] },
  ];

  /* O cartão de cima é sempre o que pede ação agora: quem está sumindo.
     Ninguém sumindo, aí sim os aniversários sobem para o cartão. */
  const anivNoCartao = risco === 0 && !!aniv?.length;

  return (
    <Tela titulo="Gestão" voltar={false} roxo solto
      capa={
        /* Regra do Heroi: contexto em cima, foco no título (o mesmo da barra
           ao rolar). Duas pílulas: três quebravam em duas linhas a 360px. */
        <Heroi sobre="Instituto Veridiana" titulo="Gestão"
          direita={<BotaoHeroi rotulo="Abrir a planilha" onClick={ir('/gestao/planilha')}><Sheet size={22} /></BotaoHeroi>}
          pilulas={g ? [
            { icone: ClipboardList, texto: plural(g.turmas, 'turma', 'turmas') },
            { icone: Users, texto: plural(g.alunosAtivos, 'aluno', 'alunos') },
          ] : []} />
      }>
      <Sobreposto>
        <CartaoAtencao risco={risco} aniv={anivNoCartao ? aniv! : null} onAbrir={ir('/gestao/risco')} />
      </Sobreposto>
      <Corpo>
        {!anivNoCartao && aniv && aniv.length > 0 && (
          <Banner tom="sucesso" icone={Cake}
            titulo={aniv.length === 1 ? 'Aniversário esta semana' : aniv.length + ' aniversários esta semana'}>
            {aniv.map((a) => (
              <span key={a.turma + a.aluno} className="block">{a.aluno} faz {a.faz} anos em {dataCurta(a.dia)}</span>
            ))}
          </Banner>
        )}

        <Atalhos itens={ATALHOS} />

        {grupos.map((gr) => (
          <section key={gr.titulo} className="mb-1">
            <CabecalhoSecao titulo={gr.titulo} />
            <GrupoNav itens={gr.itens} />
          </section>
        ))}
      </Corpo>
    </Tela>
  );
}

/* O cartão sobreposto: alerta de faltas (vermelho, com botão), ou os
   aniversários, ou "tudo em dia". Enquanto conta, um osso do mesmo tamanho. */
function CartaoAtencao({ risco, aniv, onAbrir }: {
  risco: number | undefined; aniv: Aniversario[] | null; onAbrir: () => void;
}) {
  if (risco === undefined) return <Osso className="h-21 rounded-2xl shadow-cartao" />;

  if (risco > 0) {
    return (
      <button type="button" onClick={onAbrir}
        className={clsx(CARTAO_ELEVADO, 'flex min-h-21 w-full items-center gap-3 p-4 text-left transition-colors duration-150 ease-curva active:bg-fundo')}>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-falta text-white"><Bell size={24} /></span>
        <span className="min-w-0 flex-1">
          <small className="block text-xs font-bold tracking-[.06em] text-falta uppercase">Precisam de atenção</small>
          <b className="mt-0.5 block text-lg leading-tight font-bold tracking-tight">
            {plural(risco, 'aluno faltou', 'alunos faltaram')} 3 aulas seguidas
          </b>
          <span className="mt-0.5 block text-sm text-apagado">uma mensagem agora costuma trazer de volta</span>
        </span>
        <span className="shrink-0 rounded-full bg-falta px-3.5 py-2 text-sm font-bold text-white">Ver</span>
      </button>
    );
  }

  if (aniv && aniv.length) {
    const mostrar = aniv.slice(0, 3);
    return (
      <div className={clsx(CARTAO_ELEVADO, 'flex min-h-21 items-start gap-3 p-4')}>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-presente text-white"><Cake size={24} /></span>
        <span className="min-w-0 flex-1">
          <small className="block text-xs font-bold tracking-[.06em] text-presente uppercase">
            {aniv.length === 1 ? 'Aniversário esta semana' : aniv.length + ' aniversários esta semana'}
          </small>
          {mostrar.map((a) => (
            <span key={a.turma + a.aluno} className="mt-0.5 block text-[15px] leading-snug">
              <b>{a.aluno}</b> <span className="text-apagado">faz {a.faz} em {dataCurta(a.dia)}</span>
            </span>
          ))}
          {aniv.length > mostrar.length && (
            <span className="mt-0.5 block text-sm text-apagado">e mais {aniv.length - mostrar.length}</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={clsx(CARTAO_ELEVADO, 'flex min-h-21 items-center gap-3 p-4')}>
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-presente text-white"><Check size={24} strokeWidth={2.6} /></span>
      <span className="min-w-0 flex-1">
        <small className="block text-xs font-bold tracking-[.06em] text-presente uppercase">Tudo em dia</small>
        <b className="mt-0.5 block text-lg leading-tight font-bold tracking-tight">Ninguém faltando seguido</b>
        <span className="mt-0.5 block text-sm text-apagado">vale olhar aqui uma vez por semana</span>
      </span>
    </div>
  );
}
