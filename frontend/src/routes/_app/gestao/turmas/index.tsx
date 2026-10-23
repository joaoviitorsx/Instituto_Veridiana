/* Turmas ativas, com quantos alunos cada uma tem. */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';
import { leitura } from '../../../../api/cliente';
import { Tela } from '../../../../ui/Tela';
import { BotaoCheio, CartaoNav, Esqueleto, Estado } from '../../../../ui/kit';
import { ErroTela } from '../../../../ui/ErroTela';
import { folha } from '../../../../ui/folha';
import { plural } from '../../../../util';
import { gravar, type TurmaGestao } from '../-comum';

export const Route = createFileRoute('/_app/gestao/turmas/')({ component: Turmas });

function Turmas() {
  const navigate = useNavigate();
  const q = useQuery(leitura<TurmaGestao[]>('listarTurmasCompleto'));

  function nova() {
    folha.pedirTexto('Criar turma', 'Nome da turma', '', 'Criar', (nome) => {
      gravar('criarTurma', [nome], 'Turma ' + nome + ' criada');
    });
  }

  return (
    <Tela titulo="Turmas" voltar="/gestao" barra={<BotaoCheio icone={Plus} onClick={nova}>Criar turma</BotaoCheio>}>
      {q.data ? (
        q.data.length ? (
          <ul>
            {q.data.map((t) => (
              <CartaoNav key={t.nome} titulo={t.nome}
                sub={plural(t.ativos, 'aluno', 'alunos') + (t.inativos ? ' · ' + plural(t.inativos, 'inativo', 'inativos') : '')}
                onClick={() => navigate({ to: '/gestao/turmas/$turma', params: { turma: t.nome } })} />
            ))}
          </ul>
        ) : (
          <Estado icone={ClipboardList} titulo="Nenhuma turma ainda" texto='Toque em "Criar turma" aqui embaixo para começar.' />
        )
      ) : q.isError ? <ErroTela erro={q.error} tentar={() => q.refetch()} /> : <Esqueleto n={4} />}
    </Tela>
  );
}
