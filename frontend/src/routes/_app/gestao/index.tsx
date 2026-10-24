/* Menu da gestão: cadastros, acessos, QR, histórico e planilha.
   Os contadores chegam depois da tela, cada um por si: ler Chamadas para
   o alerta de faltas custa caro e não pode segurar o menu. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, CalendarClock, Cake, Calendar, ClipboardList, FileText, Medal, Package, QrCode, Sheet, User, Users, Wallet,
} from 'lucide-react';
import { leitura } from '../../../api/cliente';
import { Tela } from '../../../ui/Tela';
import { Banner, GrupoNav, type ItemNav } from '../../../ui/kit';
import { dataCurta, plural } from '../../../util';
import type { Aniversario, ResumoGestao } from './-comum';

export const Route = createFileRoute('/_app/gestao/')({ component: Gestao });

function Gestao() {
  const navigate = useNavigate();
  const g = useQuery(leitura<ResumoGestao>('entrarNaGestao')).data;
  const risco = useQuery(leitura<number>('contarRisco')).data;
  const aniv = useQuery(leitura<Aniversario[]>('aniversariantesSemana')).data;

  const ir = (to: string) => () => navigate({ to });
  const atencao = risco === undefined ? 'carregando…'
    : risco === 0 ? 'ninguém faltando seguido, ótimo'
      : <span className="text-falta">{plural(risco, 'aluno some há 3 aulas', 'alunos somem há 3 aulas')}</span>;

  /* Agrupado por assunto, como os Ajustes do celular: quatro blocos
     curtos se leem mais rápido que dez cartões soltos. */
  const grupos: { titulo: string; itens: ItemNav[] }[] = [
    { titulo: 'Pessoas', itens: [
      { icone: ClipboardList, titulo: 'Turmas', sub: plural(g?.turmas || 0, 'turma ativa', 'turmas ativas'), onClick: ir('/gestao/turmas') },
      { icone: CalendarClock, titulo: 'Grade de aulas', sub: 'dia, hora e sala de cada turma', onClick: ir('/grade') },
      { icone: Users, titulo: 'Alunos', sub: (g?.alunosAtivos || 0) + ' ativos, ' + (g?.alunosInativos || 0) + ' inativos', onClick: ir('/gestao/alunos') },
      { icone: User, titulo: 'Equipe e acessos', sub: plural(g?.professores || 0, 'professora', 'professoras') + ', e-mail e senha', onClick: ir('/gestao/equipe') },
    ] },
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

  return (
    <Tela titulo="Gestão" voltar="/">
      {aniv && aniv.length > 0 && (
        <Banner tom="sucesso" icone={Cake}
          titulo={aniv.length === 1 ? 'Aniversário esta semana' : aniv.length + ' aniversários esta semana'}>
          {aniv.map((a) => (
            <span key={a.turma + a.aluno} className="block">{a.aluno} faz {a.faz} anos em {dataCurta(a.dia)}</span>
          ))}
        </Banner>
      )}
      {grupos.map((gr) => <GrupoNav key={gr.titulo} titulo={gr.titulo} itens={gr.itens} />)}
    </Tela>
  );
}
