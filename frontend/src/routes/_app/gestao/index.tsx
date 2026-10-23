/* Menu da gestão: cadastros, acessos, QR, histórico e planilha.
   Os contadores chegam depois da tela, cada um por si: ler Chamadas para
   o alerta de faltas custa caro e não pode segurar o menu. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, Cake, Calendar, ClipboardList, FileText, Medal, QrCode, Sheet, User, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { CartaoNav } from '../../../ui/kit';
import { dataCurta, plural } from '../../../util';
import type { Aniversario, ResumoGestao } from './-comum';

export const Route = createFileRoute('/_app/gestao/')({ component: Gestao });

type Item = { ic: LucideIcon; t: string; s: React.ReactNode; to: string };

function Gestao() {
  const navigate = useNavigate();
  const g = useQuery(leitura<ResumoGestao>('entrarNaGestao')).data;
  const risco = useQuery(leitura<number>('contarRisco')).data;
  const aniv = useQuery(leitura<Aniversario[]>('aniversariantesSemana')).data;

  const itens: Item[] = [
    { ic: ClipboardList, t: 'Turmas', s: plural(g?.turmas || 0, 'turma ativa', 'turmas ativas'), to: '/gestao/turmas' },
    { ic: Users, t: 'Alunos', s: (g?.alunosAtivos || 0) + ' ativos, ' + (g?.alunosInativos || 0) + ' inativos', to: '/gestao/alunos' },
    { ic: User, t: 'Equipe e acessos', s: plural(g?.professores || 0, 'professora', 'professoras') + ', e-mail e senha', to: '/gestao/equipe' },
    { ic: QrCode, t: 'QR do app', s: 'cartaz para abrir o app no celular', to: '/gestao/qr' },
    {
      ic: Bell, t: 'Precisam de atenção', to: '/gestao/risco',
      s: risco === undefined ? 'carregando…'
        : risco === 0 ? 'ninguém faltando seguido, ótimo'
          : <span className="text-falta">{plural(risco, 'aluno some há 3 aulas', 'alunos somem há 3 aulas')}</span>,
    },
    { ic: Calendar, t: 'Histórico', s: 'quem veio, por dia e por mês', to: '/gestao/historico' },
    { ic: Wallet, t: 'Caixa', s: 'entradas, saídas e comprovantes', to: '/caixa' },
    { ic: Medal, t: 'Certificados', s: 'comprovante de horas para as alunas', to: '/certificados' },
    { ic: FileText, t: 'Relatório para edital', s: 'beneficiários, aulas e frequência', to: '/gestao/relatorio' },
    { ic: Sheet, t: 'Planilha', s: 'abrir e compartilhar a planilha', to: '/gestao/planilha' },
  ];

  return (
    <Tela titulo="Gestão" voltar="/">
      {aniv && aniv.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-m border border-justif-borda bg-justif-fraco p-4 text-justif-tinta">
          <Cake size={22} className="shrink-0" />
          <div className="min-w-0">
            <b className="mb-1 block text-[15px] font-bold">
              {aniv.length === 1 ? 'Aniversário esta semana' : aniv.length + ' aniversários esta semana'}
            </b>
            {aniv.map((a) => (
              <span key={a.turma + a.aluno} className="block text-sm leading-normal">
                {a.aluno} faz {a.faz} em {dataCurta(a.dia)}
              </span>
            ))}
          </div>
        </div>
      )}
      <ul>
        {itens.map((i) => (
          <CartaoNav key={i.t} icone={i.ic} titulo={i.t} sub={i.s}
            onClick={() => navigate({ to: i.to })} />
        ))}
      </ul>
    </Tela>
  );
}
